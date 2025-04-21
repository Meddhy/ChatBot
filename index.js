const messagesContainer = document.getElementById("chat-messages");
const optionsContainer = document.getElementById("options-container");

function afficherMessage(message, estBot = true) {
    const messageDiv = document.createElement("div");
    messageDiv.className = estBot ? "message-bot" : "message-utilisateur";
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function afficherOptions(options) {
    optionsContainer.innerHTML = "";
    options.forEach(option => {
        const button = document.createElement("button");
        button.className = "bouton-option";
        button.textContent = option;
        button.addEventListener("click", () => traiterChoixOption(option));
        optionsContainer.appendChild(button);
    });
}

function traiterChoixOption(option) {
    afficherMessage(option, false);

    // Requête AJAX pour envoyer l'option choisie par l'utilisateur
    $.ajax({
        url: 'index.php',  // URL de votre script PHP
        method: 'POST',     // Méthode HTTP
        contentType: 'application/json', // Type de contenu
        data: JSON.stringify({ question: option }), // Corps de la requête avec la question
        success: function(data) {
            afficherMessage(data.reponse, true);
            if (data.options && data.options.length > 0) {
                afficherOptions(data.options);
            }
        },
        error: function(xhr, status, error) {
            console.error('Erreur:', error);
            afficherMessage("Oups ! Une erreur s'est produite.", true);
        }
    });
}

// Première requête AJAX pour obtenir la réponse initiale
$.ajax({
    url: 'index.php',  // URL de votre script PHP
    method: 'POST',     // Méthode HTTP
    contentType: 'application/json', // Type de contenu
    data: JSON.stringify({ question: "" }), // Corps de la requête avec question vide pour obtenir la première réponse
    success: function(data) {
        afficherMessage(data.reponse);
        if (data.options && data.options.length > 0) {
            afficherOptions(data.options);
        }
    },
    error: function(xhr, status, error) {
        console.error('Erreur:', error);
        afficherMessage("Oups ! Une erreur s'est produite.", true);
    }
});
