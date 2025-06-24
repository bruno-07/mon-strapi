'use strict';

/**
 * confirmation-code controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { ApplicationError } = require('@strapi/utils').errors;

module.exports = createCoreController('api::confirmation-code.confirmation-code', ({ strapi }) => ({
    /**
     * @description Vérifie un code de confirmation et confirme le compte utilisateur.
     * @param {Object} ctx - Le contexte Koa.
     * @param {string} ctx.request.body.code - Le code de confirmation à vérifier.
     * @param {string} ctx.request.body.email - L'email de l'utilisateur associé.
     */
    async verify(ctx) {
        const { code, email } = ctx.request.body;

        // --- 1. Validation des entrées ---
        if (!code || !email) {
            throw new ApplicationError('Le code et l\'email sont requis.');
        }

        // --- 2. Trouver l'utilisateur par email ---
        const user = await strapi.entityService.findOne('plugin::users-permissions.user', {
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new ApplicationError('Utilisateur non trouvé.');
        }

        // --- 3. Vérifier si l'utilisateur est déjà confirmé ---
        if (user.confirmed) {
            // Pas une erreur bloquante, juste une information
            return ctx.send({ message: 'Votre compte est déjà confirmé.' });
        }

        // --- 4. Trouver le code de confirmation associé ---
        // On cherche le dernier code non utilisé pour cet utilisateur
        const confirmationEntries = await strapi.entityService.findMany('api::confirmation-code.confirmation-code', {
            filters: {
                user: user.id,
                code: code,
                isUsed: false, // Ne considérer que les codes non utilisés
            },
            sort: { createdAt: 'desc' }, // Trie par date de création descendante pour prendre le plus récent
            limit: 1, // Ne prend que le plus récent
        });

        if (!confirmationEntries || confirmationEntries.length === 0) {
            throw new ApplicationError('Code invalide ou déjà utilisé.');
        }

        const storedCode = confirmationEntries[0];

        // --- 5. Vérifier l'expiration du code ---
        if (new Date() > new Date(storedCode.expiresAt)) {
            // Marquer le code comme utilisé même s'il est expiré pour éviter sa réutilisation future.
            // On peut également choisir de le supprimer.
            await strapi.entityService.update('api::confirmation-code.confirmation-code', storedCode.id, {
                data: { isUsed: true },
            });
            throw new ApplicationError('Code expiré. Veuillez demander un nouveau code.');
        }

        // --- 6. Confirmer le compte utilisateur ---
        await strapi.entityService.update('plugin::users-permissions.user', user.id, {
            data: { confirmed: true },
        });

        // --- 7. Marquer le code comme utilisé ---
        await strapi.entityService.update('api::confirmation-code.confirmation-code', storedCode.id, {
            data: { isUsed: true },
        });

        // --- 8. Envoyer la réponse de succès ---
        ctx.send({ message: 'Votre compte a été confirmé avec succès !' });
    },

    /**
     * @description Envoie un nouveau code de confirmation à l'email de l'utilisateur.
     * @param {Object} ctx - Le contexte Koa.
     * @param {string} ctx.request.body.email - L'email de l'utilisateur.
     */
    async resend(ctx) {
        const { email } = ctx.request.body;

        // --- 1. Validation de l'entrée ---
        if (!email) {
            throw new ApplicationError('L\'email est requis.');
        }

        // --- 2. Trouver l'utilisateur ---
        const user = await strapi.entityService.findOne('plugin::users-permissions.user', {
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new ApplicationError('Utilisateur non trouvé.');
        }

        // --- 3. Vérifier si l'utilisateur est déjà confirmé ---
        if (user.confirmed) {
            return ctx.send({ message: 'Votre compte est déjà confirmé.' });
        }

        // --- 4. Invalider les codes précédents non utilisés pour cet utilisateur ---
        // Ceci évite que d'anciens codes puissent encore être utilisés.
        const previousCodes = await strapi.entityService.findMany('api::confirmation-code.confirmation-code', {
            filters: {
                user: user.id,
                isUsed: false,
            },
        });
        for (const codeEntry of previousCodes) {
            await strapi.entityService.update('api::confirmation-code.confirmation-code', codeEntry.id, {
                data: { isUsed: true }, // Marque comme utilisé
            });
        }

        // --- 5. Générer un nouveau code ---
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // Code à 6 chiffres
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expire dans 10 minutes

        // --- 6. Stocker le nouveau code ---
        await strapi.entityService.create('api::confirmation-code.confirmation-code', {
            data: {
                code: code,
                expiresAt: expiresAt,
                isUsed: false,
                user: user.id,
            },
        });

        // --- 7. Envoyer le nouvel e-mail de confirmation ---
        try {
            await strapi.plugins['email'].services.email.send({
                to: user.email,
                from: strapi.config.get('plugin.email.settings.defaultFrom'),
                subject: 'Nouveau code de confirmation pour votre compte',
                html: `
                    <p>Bonjour ${user.username || user.email},</p>
                    <p>Voici votre nouveau code de confirmation :</p>
                    <h3>${code}</h3>
                    <p>Ce code expirera dans 10 minutes.</p>
                    <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet e-mail.</p>
                    <p>L'équipe de votre e-commerce</p>
                `,
            });
        } catch (err) {
            strapi.log.error(`Erreur lors de l'envoi du nouvel e-mail de confirmation à ${user.email}:`, err);
            // Si l'envoi de l'email échoue, cela peut être une erreur. Informez le client.
            throw new ApplicationError('Erreur lors de l\'envoi du code. Veuillez réessayer.');
        }

        // --- 8. Envoyer la réponse de succès ---
        ctx.send({ message: 'Un nouveau code de confirmation a été envoyé à votre adresse e-mail.' });
    },
}));