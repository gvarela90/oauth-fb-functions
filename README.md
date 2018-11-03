# Firebase OAuth

## Running locally

Set the serviceAccountKey path to your envs.

```shell
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
```

Install npm packages

```shell
cd functions
npm install
```

Create you config file

```shell
touch src/config.js
echo 'module.exports = {
  RECAPTCHA_SECRET_KEY: "<recaptcha-server-secret-key>",
  GOOGLE_AUTHENTICATOR_NAME: "<Name on google authenticator>"
};' > src/config.js
```

Run the server

```shell
npm run node-dev
```
