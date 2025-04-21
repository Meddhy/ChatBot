<?php
class QuestionReponse
{
    private $pdo;

    // Constructeur pour établir la connexion à la base de données
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Ajouter une réponse prédéfinie
     * @param string $reponse
     * @return int L'ID de la réponse ajoutée
     */
    public function ajouterReponse($reponse)
    {
        $sql = "INSERT INTO reponse (reponse) VALUES (:reponse)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':reponse', $reponse);
        $stmt->execute();
        return $this->pdo->lastInsertId();
    }

    /**
     * Ajouter une question
     * @param string $question
     * @param int|null $categorie
     * @param int|null $reponseId
     * @return int L'ID de la question ajoutée
     */
    public function ajouterQuestion($question, $categorie = null, $reponseId = null)
    {
        $sql = "INSERT INTO question (categorie, question, reponse_id) VALUES (:categorie, :question, :reponse_id)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':categorie', $categorie, PDO::PARAM_INT);
        $stmt->bindParam(':question', $question);
        $stmt->bindParam(':reponse_id', $reponseId, PDO::PARAM_INT);
        $stmt->execute();
        return $this->pdo->lastInsertId();
    }

    /**
     * Récupérer toutes les réponses
     * @return array
     */
    public function obtenirReponses()
    {
        $sql = "SELECT * FROM reponse ORDER BY date_creation DESC";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Récupérer toutes les questions avec leurs réponses
     * @return array
     */
    public function obtenirQuestionsAvecReponses()
    {
        $sql = "
            SELECT q.id AS question_id, q.categorie, q.question, q.date_creation AS question_date, 
                   r.id AS reponse_id, r.reponse, r.date_creation AS reponse_date
            FROM question q
            LEFT JOIN reponse r ON q.reponse_id = r.id
            ORDER BY q.date_creation DESC
        ";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Mettre à jour une réponse
     * @param int $id
     * @param string $nouvelleReponse
     * @return bool
     */
    public function updateReponse($id, $nouvelleReponse)
    {
        $sql = "UPDATE reponse SET reponse = :reponse WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':reponse', $nouvelleReponse);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    /**
     * Mettre à jour une question
     * @param int $id
     * @param string $nouvelleQuestion
     * @param int|null $nouvelleReponseId
     * @return bool
     */
    public function updateQuestion($id, $nouvelleQuestion, $nouvelleReponseId = null)
    {
        $sql = "UPDATE question SET question = :question, reponse_id = :reponse_id WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':question', $nouvelleQuestion);
        $stmt->bindParam(':reponse_id', $nouvelleReponseId, PDO::PARAM_INT);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    /**
     * Supprimer une réponse
     * @param int $id
     * @return bool
     */
    public function supprimerReponse($id)
    {
        $sql = "DELETE FROM reponse WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    /**
     * Supprimer une question
     * @param int $id
     * @return bool
     */
    public function supprimerQuestion($id)
    {
        $sql = "DELETE FROM question WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
