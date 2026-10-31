export const TOAST_TRANSLATIONS_FR: Record<string, string> = {
  // Auth & Account
  "Verification code sent to your email.": "Code de vérification envoyé à votre adresse e-mail.",
  "A new verification code has been sent to your email.": "Un nouveau code de vérification a été envoyé à votre e-mail.",
  "Password reset successfully! Welcome back.": "Mot de passe réinitialisé avec succès ! Bon retour parmi nous.",
  "Password reset! Please sign in with your new password.": "Mot de passe réinitialisé ! Veuillez vous connecter avec votre nouveau mot de passe.",
  "Password reset successfully. Welcome back.": "Mot de passe réinitialisé avec succès. Bon retour parmi nous.",
  "Signed in with Google successfully.": "Connexion avec Google réussie.",
  "Google sign-in failed.": "Échec de la connexion Google.",
  "Google sign-in cancelled or failed": "Connexion Google annulée ou échouée",
  "Could not launch Google Sign-In": "Impossible de lancer la connexion Google",
  "Account created with Google successfully.": "Compte créé avec Google avec succès.",
  "Google registration failed.": "Échec de l'inscription avec Google.",
  "Apple sign-in is currently unavailable. Please use Google or email.": "La connexion Apple est actuellement indisponible. Veuillez utiliser Google ou votre e-mail.",
  "Apple sign-up is currently unavailable. Please use Google or email.": "L'inscription Apple est actuellement indisponible. Veuillez utiliser Google ou votre e-mail.",
  "Signed in as Client.": "Connecté en tant que Client.",
  "Signed in as Stylist.": "Connecté en tant que Coiffeur.",
  "Signed in to Salon & Barber workspace.": "Connecté à l'espace Salon & Coiffeur.",
  "Signed in successfully.": "Connexion réussie.",
  "Welcome to Trimly. Account created successfully.": "Bienvenue sur Trimly. Compte créé avec succès.",
  "Account created successfully!": "Compte créé avec succès !",
  "Logged out successfully.": "Déconnexion réussie.",
  "This account is registered as a partner (barber/hairdresser). Please use the Trimly Partner app to log in.": "Ce compte est enregistré en tant que partenaire. Veuillez utiliser l'application Trimly Partner pour vous connecter.",
  "This account is registered as a client. Please use the Trimly Client app to log in.": "Ce compte est enregistré en tant que client. Veuillez utiliser l'application Trimly Client pour vous connecter.",
  
  // Bookings & Services
  "Booking deleted from history": "Réservation supprimée de l'historique",
  "Could not delete booking from history": "Impossible de supprimer la réservation de l'historique",
  "Please keep at least one service selected.": "Veuillez conserver au moins un service sélectionné.",
  "Booking confirmed!": "Réservation confirmée !",
  "Booking cancelled": "Réservation annulée",
  "Appointment rescheduled successfully.": "Rendez-vous reprogrammé avec succès.",
  "Could not reschedule appointment": "Impossible de reprogrammer le rendez-vous",
  "Appointment cancelled successfully": "Rendez-vous annulé avec succès",
  "Booking rescheduled successfully!": "Réservation reprogrammée avec succès !",

  // Profile & General
  "Profile refreshed.": "Profil actualisé.",
  "Profile updated successfully.": "Profil mis à jour avec succès.",
  "Password updated successfully.": "Mot de passe mis à jour avec succès.",
  "Copied to clipboard!": "Copié dans le presse-papiers !",
  "Address copied to clipboard": "Adresse copiée dans le presse-papiers",
  "Phone number copied to clipboard": "Numéro de téléphone copié dans le presse-papiers",
  "Saved to favorites!": "Ajouté aux favoris !",
  "Removed from favorites.": "Retiré des favoris.",
  "Review submitted successfully!": "Avis envoyé avec succès !",
  "All notifications marked as read.": "Toutes les notifications ont été marquées comme lues.",

  // Partner Specific
  "Service added successfully": "Service ajouté avec succès",
  "Service updated successfully": "Service mis à jour avec succès",
  "Service deleted successfully": "Service supprimé avec succès",
  "Cut added to portfolio!": "Coupe ajoutée au portfolio !",
  "Cut deleted from portfolio": "Coupe supprimée du portfolio",
  "Working hours updated successfully": "Horaires d'ouverture mis à jour avec succès",
  "Staff member added successfully": "Membre du personnel ajouté avec succès",
  "Staff member updated successfully": "Membre du personnel mis à jour avec succès",
  "Staff member removed": "Membre du personnel supprimé",
  "Please enter an existing barber or hairdresser email.": "Veuillez saisir l'e-mail d'un coiffeur existant.",
  "Please enter a salon email address.": "Veuillez saisir l'adresse e-mail d'un salon.",
  "Could not verify barber email. Please check network connection.": "Impossible de vérifier l'e-mail du coiffeur. Vérifiez votre connexion réseau.",
  "Could not verify salon email. Please check network connection.": "Impossible de vérifier l'e-mail du salon. Vérifiez votre connexion réseau.",

  // System & Errors
  "Our servers are currently experiencing high demand. Please try again in a few moments.": "Nos serveurs connaissent actuellement une forte demande. Veuillez réessayer dans quelques instants.",
  "Network error. Please check your internet connection.": "Erreur réseau. Veuillez vérifier votre connexion Internet.",
  "Invalid email or password.": "E-mail ou mot de passe invalide.",
  "An unexpected error occurred. Please try again.": "Une erreur inattendue est survenue. Veuillez réessayer.",
  "Invalid or expired verification code.": "Code de vérification invalide ou expiré.",
  "Invalid or expired code.": "Code invalide ou expiré.",
};

export function translateToastText(text: string | undefined, lang: string): string {
  if (!text || lang !== "fr") return text || "";
  if (TOAST_TRANSLATIONS_FR[text]) return TOAST_TRANSLATIONS_FR[text];

  for (const [en, fr] of Object.entries(TOAST_TRANSLATIONS_FR)) {
    if (text.toLowerCase().trim() === en.toLowerCase().trim()) return fr;
    if (text.startsWith(en)) return text.replace(en, fr);
  }
  return text;
}
