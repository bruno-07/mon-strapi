// config/plugins.js

module.exports = ({ env }) => ({
  // ... autres plugins si vous en avez (ex: strapi-plugin-cloud-image-optimization)

  email: {
    config: {
      provider: 'nodemailer', // Utilise Nodemailer comme fournisseur
      providerOptions: {
        host: env('SMTP_HOST'), // Ex: 'smtp.gmail.com', 'smtp.sendgrid.net'
        port: env.int('SMTP_PORT', 587), // Ex: 587 (TLS) ou 465 (SSL)
        auth: {
          user: env('SMTP_USERNAME'), // Votre nom d'utilisateur SMTP
          pass: env('SMTP_PASSWORD'), // Votre mot de passe SMTP (ou clé API)
        },
         secure: env.bool('SMTP_SECURE', false), // Si votre port est 465, mettez à true. Pour 587, laissez à false
        // ignoreTLS: env.bool('SMTP_IGNORE_TLS', false), // Utile si vous avez des problèmes de TLS, mais à éviter en production
         requireTLS: env.bool('SMTP_REQUIRE_TLS', true), // Requis pour certains serveurs comme Gmail
      },
      settings: {
        defaultFrom: env('SMTP_FROM_EMAIL', 'no-reply@yourdomain.com'), // L'adresse email qui enverra les emails
        defaultReplyTo: env('SMTP_REPLY_TO_EMAIL', 'no-reply@yourdomain.com'), // L'adresse pour les réponses
      },
    },
  },

  // ... autres plugins
});
