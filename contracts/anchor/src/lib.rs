#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, Address,
    BytesN, Env, String,
};

#[contract]
pub struct AnchorContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnchorRecord {
    pub owner: Address,
    pub meta_cid: String,
    pub ledger: u32,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AnchorError {
    AlreadyAnchored = 1,
    MetaTooLong = 2,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Anchored {
    #[topic]
    pub hash: BytesN<32>,
    pub owner: Address,
    pub meta_cid: String,
}

const META_MAX: u32 = 128;
const TTL_THRESHOLD: u32 = 17280;
const TTL_EXTEND_TO: u32 = 3110400;

#[contractimpl]
impl AnchorContract {
    pub fn __constructor(env: Env, operator: Address) {
        env.storage()
            .instance()
            .set(&symbol_short!("op"), &operator);
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    pub fn anchor(
        env: Env,
        hash: BytesN<32>,
        meta_cid: String,
        owner: Address,
    ) -> Result<AnchorRecord, AnchorError> {
        let operator: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("op"))
            .expect("operator");
        operator.require_auth();

        if meta_cid.len() > META_MAX {
            return Err(AnchorError::MetaTooLong);
        }

        if let Some(existing) = env.storage().persistent().get::<_, AnchorRecord>(&hash) {
            if existing.meta_cid == meta_cid && existing.owner == owner {
                return Ok(existing);
            }
            return Err(AnchorError::AlreadyAnchored);
        }

        let owner_for_event = owner.clone();
        let record = AnchorRecord {
            owner,
            meta_cid: meta_cid.clone(),
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&hash, &record);
        env.storage()
            .persistent()
            .extend_ttl(&hash, TTL_THRESHOLD, TTL_EXTEND_TO);

        Anchored {
            hash,
            owner: owner_for_event,
            meta_cid,
        }
        .publish(&env);

        Ok(record)
    }

    pub fn verify(env: Env, hash: BytesN<32>) -> Option<AnchorRecord> {
        env.storage().persistent().get(&hash)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Events as _;
    use soroban_sdk::testutils::Ledger as _;
    use soroban_sdk::{Address, BytesN, Env, String};

    fn hash_bytes(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[1u8; 32])
    }

    fn register(env: &Env, operator: &Address) -> Address {
        env.register(AnchorContract, (operator,))
    }

    #[test]
    fn anchor_then_verify() {
        let env = Env::default();
        env.ledger().set_sequence_number(100);
        env.ledger().set_timestamp(1_700_000_000);

        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let hash = hash_bytes(&env);
        let meta = String::from_str(&env, "doc:abc");
        let owner = operator.clone();

        env.mock_all_auths();
        let record = client.anchor(&hash, &meta, &owner);
        assert_eq!(record.owner, owner);
        assert_eq!(record.meta_cid, meta);
        assert_eq!(record.ledger, 100);
        assert_eq!(record.timestamp, 1_700_000_000);

        let verified = client.verify(&hash);
        assert_eq!(verified, Some(record));
    }

    #[test]
    fn reanchor_same_payload_keeps_first_ledger() {
        let env = Env::default();
        env.ledger().set_sequence_number(100);
        env.ledger().set_timestamp(1_700_000_000);

        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let hash = hash_bytes(&env);
        let meta = String::from_str(&env, "doc:same");
        let owner = operator.clone();

        env.mock_all_auths();
        client.anchor(&hash, &meta, &owner);

        env.ledger().set_sequence_number(200);
        client.anchor(&hash, &meta, &owner);

        let verified = client.verify(&hash).unwrap();
        assert_eq!(verified.ledger, 100);
        assert_eq!(verified.timestamp, 1_700_000_000);
    }

    #[test]
    fn reanchor_different_meta_errors() {
        let env = Env::default();
        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let hash = hash_bytes(&env);
        let owner = operator.clone();

        env.mock_all_auths();
        client.anchor(&hash, &String::from_str(&env, "doc:a"), &owner);

        let err = client.try_anchor(
            &hash,
            &String::from_str(&env, "doc:b"),
            &owner,
        );
        assert_eq!(err, Err(Ok(AnchorError::AlreadyAnchored)));

        let verified = client.verify(&hash).unwrap();
        assert_eq!(verified.meta_cid, String::from_str(&env, "doc:a"));
    }

    #[test]
    fn reanchor_different_owner_errors() {
        let env = Env::default();
        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let hash = hash_bytes(&env);
        let other = Address::generate(&env);

        env.mock_all_auths();
        client.anchor(&hash, &String::from_str(&env, "doc:a"), &operator);

        let err = client.try_anchor(
            &hash,
            &String::from_str(&env, "doc:a"),
            &other,
        );
        assert_eq!(err, Err(Ok(AnchorError::AlreadyAnchored)));
    }

    #[test]
    fn unauthorized() {
        let env = Env::default();
        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let hash = hash_bytes(&env);
        let err = client.try_anchor(
            &hash,
            &String::from_str(&env, "doc:x"),
            &operator,
        );
        assert!(err.is_err());
    }

    #[test]
    fn verify_unknown_is_none() {
        let env = Env::default();
        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        assert_eq!(client.verify(&hash_bytes(&env)), None);
    }

    #[test]
    fn meta_too_long() {
        let env = Env::default();
        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let long = String::from_str(&env, &"a".repeat(129));
        env.mock_all_auths();
        let err = client.try_anchor(&hash_bytes(&env), &long, &operator);
        assert_eq!(err, Err(Ok(AnchorError::MetaTooLong)));
        assert_eq!(client.verify(&hash_bytes(&env)), None);
    }

    #[test]
    fn meta_at_max_ok() {
        let env = Env::default();
        let operator = Address::generate(&env);
        let contract_id = register(&env, &operator);
        let client = AnchorContractClient::new(&env, &contract_id);

        let meta = String::from_str(&env, &"a".repeat(128));
        env.mock_all_auths();
        client.anchor(&hash_bytes(&env), &meta, &operator);
        assert!(client.verify(&hash_bytes(&env)).is_some());
    }
}
