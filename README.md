# webRTC example

## create certificate file
1. `npm install mkcert`
2. `npx mkcert create-ca --key ./cert/ca.key --cert ./cert/ca.crt `
2. `npx mkcert create-cert --ca-key ./cert/ca.key --ca-cert ./cert/ca.crt --key ./cert/cert.key --cert ./cert/cert.crt`