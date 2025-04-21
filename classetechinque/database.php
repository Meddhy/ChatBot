<?php
// Configuration de la connexion à la base de données
$host = ''; // Adresse du serveur de base de données
$dbname = ''; // Nom de la base de données à utiliser
$username = ''; // Nom d'utilisateur pour la connexion à la base de données
$password = ''; // Mot de passe pour la connexion à la base de données

try {
    // Création d'une nouvelle instance PDO pour se connecter à la base de données
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    // Configuration pour afficher les erreurs de PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // En cas d'erreur de connexion, retourner un message d'erreur en JSON
    echo json_encode(['response' => 'Erreur de connexion à la base de données.', 'options' => []]);
    exit;
}
?>
