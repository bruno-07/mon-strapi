'use strict';

const utils = require('@strapi/utils');
const { ApplicationError } = utils.errors;

module.exports = (plugin) => {

  // ==========================================================
  // Surcharge de la fonction de registration (inscription)
  // Permet d'ajouter phoneNumber, de définir confirmed à false
  // et d'envoyer un code de confirmation par email.
  // ==========================================================
  plugin.controllers.auth.register = async (ctx) => {
    const { email, username, password, phoneNumber } = ctx.request.body; // Récupère le numéro de téléphone

    // --- 1. Validation initiale ---
    if (!email || !password) {
      throw new ApplicationError('Email and password are required.');
    }
    // Ajoutez une validation pour phoneNumber si vous le rendez obligatoire
    if (!phoneNumber) {
      throw new ApplicationError('Le numéro de téléphone est requis.');
    }

    // --- 2. Vérifier si l'email est déjà pris ---
    const existingUser = await strapi.entityService.findOne('plugin::users-permissions.user', {
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ApplicationError('Cet email est déjà utilisé.');
    }

    // --- 3. Créer l'utilisateur ---
    // Important : 'confirmed' est défini à 'false' par défaut ici.
    // L'utilisateur ne pourra se connecter qu'après confirmation.
    const newUser = await strapi.entityService.create('plugin::users-permissions.user', {
      data: {
        email: email.toLowerCase(),
        username: username || email.toLowerCase(), // Utilise l'email comme nom d'utilisateur si non fourni
        password: password,
        phoneNumber: phoneNumber, // Sauvegarde le numéro de téléphone
        confirmed: false, // L'utilisateur n'est pas confirmé au moment de l'inscription
        role: (await strapi.entityService.findOne('plugin::users-permissions.role', {
          where: { type: 'authenticated' }
        })).id, // Assignation du rôle par défaut 'authenticated'
      },
    });

    // --- 4. Générer et stocker le code de confirmation ---
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Génère un code à 6 chiffres
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Code expire dans 10 minutes (10 * 60 secondes * 1000 ms)

    await strapi.entityService.create('api::confirmation-code.confirmation-code', {
      data: {
        code: code,
        expiresAt: expiresAt,
        isUsed: false,
        user: newUser.id,
      },
    });

    // --- 5. Envoyer l'e-mail de confirmation ---
    try {
      await strapi.plugins['email'].services.email.send({
        to: newUser.email,
        // Assurez-vous que 'defaultFrom' est configuré dans votre plugin d'email Strapi (config/plugins.js)
        from: strapi.config.get('plugin.email.settings.defaultFrom'),
        subject: 'Confirmez votre adresse e-mail pour votre compte',
        html: `
          <p>Bonjour ${newUser.username || newUser.email},</p>
          <p>Merci de vous être inscrit(e) ! Pour finaliser votre inscription et confirmer votre compte, veuillez utiliser le code ci-dessous :</p>
          <h3>${code}</h3>
          <p>Ce code expirera dans 10 minutes.</p>
          <p>Si vous n'avez pas demandé cette inscription, veuillez ignorer cet e-mail.</p>
          <p>L'équipe de votre e-commerce</p>
          <p>Visitez notre site : ${strapi.config.get('server.url')}</p>
        `,
      });
    } catch (err) {
      // Si l'envoi de l'email échoue, Strapi le loguera.
      // Vous pourriez vouloir implémenter une logique de relance ou de notification ici.
      strapi.log.error(`Erreur lors de l'envoi de l'e-mail de confirmation à ${newUser.email}:`, err);
      // Ne pas bloquer l'inscription pour une erreur d'emailisation à moins que ce ne soit critique.
      // throw new ApplicationError('Erreur lors de l\'envoi de l\'e-mail de confirmation. Veuillez réessayer.');
    }

    // --- 6. Retourner une réponse au frontend ---
    // L'utilisateur n'est PAS connecté ici. Le frontend doit rediriger vers la page de confirmation.
    ctx.send({
      message: 'Inscription réussie. Un code de confirmation a été envoyé à votre adresse e-mail.',
      user: {
        id: newUser.id,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        confirmed: newUser.confirmed, // Doit être false
      },
    });
  };

  // ==========================================================
  // Surcharge de la fonction de callback (connexion)
  // Bloque la connexion si l'utilisateur n'est pas confirmé.
  // ==========================================================
  plugin.controllers.auth.callback = async (ctx) => {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      throw new ApplicationError('Identifiant et mot de passe sont requis.');
    }

    // --- 1. Trouver l'utilisateur par email ou username ---
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: {
        $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
    });

    if (!user) {
      throw new ApplicationError('Identifiant ou mot de passe invalide.');
    }

    // --- 2. Vérifier si l'utilisateur est confirmé ---
    if (!user.confirmed) {
      throw new ApplicationError('Votre compte n\'a pas encore été confirmé. Veuillez vérifier votre e-mail pour le code de confirmation.');
    }

    // --- 3. Si l'utilisateur est confirmé, laisser la logique de connexion par défaut de Strapi prendre le relais ---
    // C'est essentiel pour que Strapi puisse vérifier le mot de passe, générer le JWT, etc.
    // On appelle la fonction `callback` originale du plugin Strapi.
    // On utilise `Reflect.apply` pour s'assurer que `this` est correctement lié.
    return Reflect.apply(plugin.controllers.auth.callback, plugin.controllers.auth, [ctx]);
  };

  return plugin;
};