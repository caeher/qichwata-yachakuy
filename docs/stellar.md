# Stellar, Alchemy y Soroban

## Redes

`STELLAR_NETWORK`:

- `testnet` (por defecto) — passphrase `Test SDF Network ; September 2015`
- `mainnet` — passphrase `Public Global Stellar Network ; September 2015`

La lógica de URLs está en `lib/stellar/endpoints.ts`.

## Alchemy

1. Crea una app en [Alchemy](https://www.alchemy.com/) con la cadena **Stellar**.
2. Copia la API key al servidor como `ALCHEMY_STELLAR_API_KEY` (sin prefijo `NEXT_PUBLIC_`).

Hosts usados por la app:

| Red     | RPC                                              |
| ------- | ------------------------------------------------ |
| Testnet | `https://stellar-testnet.g.alchemy.com/v2/<key>` |
| Mainnet | `https://stellar-mainnet.g.alchemy.com/v2/<key>` |

Websocket (`wss://...`) aparece en `.env.example` pero **no** lo usa la aplicación.

### Sin clave de Alchemy

- **Testnet:** RPC público `https://soroban-testnet.stellar.org`, Horizon `https://horizon-testnet.stellar.org`.
- **Mainnet:** solo Horizon `https://horizon.stellar.org`. No hay RPC Soroban público en este código; para anclar o verificar en mainnet necesitas Alchemy (u otro RPC compatible).

## La clave no se filtra

`lib/stellar/redact.ts` quita la key de logs y de la respuesta de `GET /api/stellar/health`. No expongas la hot wallet ni la key en el cliente.

## Contrato `contracts/anchor`

- Operador fijado en el constructor; solo el operador puede llamar `anchor`.
- Clave de anclaje: hash SHA-256 de 32 bytes.
- `meta_cid` máximo 128 caracteres (`META_MAX`).
- Re-anclar el mismo hash con el mismo metadata y owner devuelve el registro original; metadata u owner distintos fallan.

Comandos locales:

```bash
pnpm contract:test    # cargo test (Rust ≥ 1.98 recomendado)
pnpm contract:build   # WASM (CLI Stellar v28)
pnpm contract:deploy  # despliegue; copia STELLAR_CONTRACT_ID al servidor
```

Los snapshots en `contracts/anchor/test_snapshots/` forman parte de los tests; no los borres.

## Monedero caliente

`STELLAR_HOT_WALLET_SECRET` firma transacciones en el servidor. El navegador nunca la ve. No llames a Friendbot desde el proceso Next; financia testnet fuera de la app.

## Salud

`GET /api/stellar/health` es público. Comprueba red y redacta secretos.

## Stellar Expert

Enlaces de transacción: `lib/anchors/expert-url.ts` →

- Testnet: `https://stellar.expert/explorer/testnet/tx/<hash>`
- Mainnet: `https://stellar.expert/explorer/public/tx/<hash>`

## Secretos (Stellar)

| Variable                    | Notas                      |
| --------------------------- | -------------------------- |
| `ALCHEMY_STELLAR_API_KEY`   | Solo servidor              |
| `STELLAR_HOT_WALLET_SECRET` | Solo servidor              |
| `STELLAR_CONTRACT_ID`       | ID del contrato desplegado |
| `STELLAR_NETWORK`           | `testnet` o `mainnet`      |

Ver también [architecture.md](./architecture.md).
