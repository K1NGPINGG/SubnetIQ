# Bundled Nginx reverse proxy for the SubnetIQ app (with-proxy profile).
# Adds the OpenSSL CLI on top of the official Nginx image so the entrypoint
# can generate self-signed certificates at boot.
FROM nginx:alpine

RUN apk add --no-cache openssl
