# EternalMC Store — starter project

This is a starter store for PKR-priced Minecraft ranks with **manual payment verification**. It does not connect to JazzCash, Easypaisa, SadaPay, or automatically deliver Minecraft ranks yet.

## Requirements
- Debian 13 VPS
- Node.js 20+
- Nginx
- A domain for public HTTPS before launch

## Local setup
1. Copy `.env.example` to `.env`.
2. Change `ADMIN_TOKEN` to a long random secret.
3. Set `PAYMENT_INSTRUCTIONS` only after confirming your payment method/provider supports receiving store payments.
4. Install dependencies with `npm install`.
5. Run with `npm start`.

Example:
```bash
cp .env.example .env
nano .env
npm install
npm start
```

## Admin API
Use HTTPS only on a live site. Keep the token secret.

List orders:
```bash
curl -H "x-admin-token: YOUR_ADMIN_TOKEN" https://YOUR_DOMAIN/api/admin/orders
```

Mark payment verified after manually checking the actual incoming transaction:
```bash
curl -X POST -H "x-admin-token: YOUR_ADMIN_TOKEN" https://YOUR_DOMAIN/api/admin/orders/EMC-ORDERID/mark-paid
```

Reject an order:
```bash
curl -X POST -H "x-admin-token: YOUR_ADMIN_TOKEN" https://YOUR_DOMAIN/api/admin/orders/EMC-ORDERID/mark-rejected
```

## Before production
- Set up domain + HTTPS (for example, Certbot with Nginx).
- Replace demo rank names, prices, and descriptions with real products.
- Use a supported merchant payment gateway and verify payments server-side if available.
- Do not treat screenshots or customer claims as payment proof; verify the transaction in your merchant account.
- Add a proper database, backups, privacy policy, terms/refund policy, and admin dashboard before handling real customers.
- This starter does not execute Minecraft commands or deliver ranks automatically.
