'use strict';

/**
 * confirmation-code router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::confirmation-code.confirmation-code', {
    routes: [
        // Route pour la vérification du code de confirmation
        {
            method: 'POST',
            path: '/confirmation-codes/verify', // L'URL que votre frontend appellera
            handler: 'confirmation-code.verify', // Nom du contrôleur et de la méthode
            config: {
                auth: false, // Important : pas besoin d'être authentifié pour vérifier un compte après inscription
            },
        },
        // Route pour le renvoi d'un nouveau code de confirmation
        {
            method: 'POST',
            path: '/confirmation-codes/resend', // L'URL que votre frontend appellera
            handler: 'confirmation-code.resend', // Nom du contrôleur et de la méthode
            config: {
                auth: false, // Important : pas besoin d'être authentifié pour demander un nouveau code
            },
        },
        // --- Routes par défaut (Core Router) ---
        // Par défaut, createCoreRouter inclut des routes pour CUD (Create, Update, Delete) et Find.
        // Si vous voulez restreindre l'accès à ces routes par défaut, vous pouvez les laisser commentées
        // ou les supprimer si vous ne les utilisez pas, ou configurer leur `auth` à `true`
        // et définir des permissions dans l'admin Strapi.
        // Pour les besoins de ce cas d'usage (confirmation de compte), `verify` et `resend`
        // sont les seules routes publiques nécessaires pour cette API.
        // Je les laisse commentées par défaut, à décommenter si besoin avec la configuration appropriée.
        /*
        {
            method: 'GET',
            path: '/confirmation-codes',
            handler: 'confirmation-code.find',
            config: {
                auth: false, // Ou true et définir des rôles
            },
        },
        {
            method: 'GET',
            path: '/confirmation-codes/:id',
            handler: 'confirmation-code.findOne',
            config: {
                auth: false, // Ou true et définir des rôles
            },
        },
        {
            method: 'POST',
            path: '/confirmation-codes',
            handler: 'confirmation-code.create',
            config: {
                auth: false, // Ou true et définir des rôles
            },
        },
        {
            method: 'PUT',
            path: '/confirmation-codes/:id',
            handler: 'confirmation-code.update',
            config: {
                auth: false, // Ou true et définir des rôles
            },
        },
        {
            method: 'DELETE',
            path: '/confirmation-codes/:id',
            handler: 'confirmation-code.delete',
            config: {
                auth: false, // Ou true et définir des rôles
            },
        },
        */
    ],
});