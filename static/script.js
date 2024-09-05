class AdventureGame {
    constructor() {
        this.elements = {
            generateBtn: document.getElementById('generate'),
            themeInput: document.getElementById('theme-input'),
            storyContainer: document.getElementById('story-container'),
            storyText: document.getElementById('story-text'),
            storyImage: document.getElementById('story-image'),
            imageContainer: document.getElementById('image-container'),
            choices: document.getElementById('choices'),
            imageLoader: document.getElementById('image-loader'),
            loadingAnimation: document.getElementById('loading-animation'),
            themeSelector: document.getElementById('theme-choice'),
            mainTitle: document.getElementById('main-title'),
            minigameContainer: document.getElementById('minigame-container'),
            minigameDescription: document.getElementById('minigame-description'),
            minigameInput: document.getElementById('minigame-input'),
            minigameSubmit: document.getElementById('minigame-submit'),
            minigameResult: document.getElementById('minigame-result')
        };

        this.currentStory = {
            title: '',
            text: '',
            choices: [],
            imageUrl: '',
            history: []
        };

        this.minigame = {
            active: false,
            targetNumber: 0,
            attempts: 0,
            maxAttempts: 5
        };

        this.init();
    }

    init() {
        console.log("Initialisation de l'application");
        this.validateElements();
        this.elements.generateBtn.addEventListener('click', () => this.generateStory());
        this.elements.themeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.generateStory();
            }
        });
        this.elements.themeSelector.addEventListener('change', (e) => this.changeTheme(e.target.value));
        this.elements.minigameSubmit.addEventListener('click', () => this.handleMinigameGuess());

        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.changeTheme(savedTheme);
        this.elements.themeSelector.value = savedTheme;
        console.log("Initialisation terminée");
    }

    validateElements() {
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) console.error(`L'élément ${key} n'a pas été trouvé dans le DOM`);
        });
    }

    changeTheme(theme) {
        console.log(`Changement de thème : ${theme}`);
        document.body.className = `${theme}-theme`;
        localStorage.setItem('theme', theme);
    }

    async generateStory() {
        console.log("Début de la génération de l'histoire");
        const theme = this.elements.themeInput.value.trim();
        if (!theme) {
            alert("Veuillez entrer un thème avant de commencer l'aventure.");
            return;
        }

        this.showLoadingState();
        this.clearUI();

        try {
            console.log(`Envoi de la requête au serveur avec le thème : ${theme}`);
            const data = await this.fetchData('/generate', { theme });
            console.log("Réponse du serveur reçue :", data);

            if (!data || typeof data !== 'object') {
                throw new Error("La réponse du serveur n'est pas au format attendu");
            }

            this.currentStory = {
                title: data.title || "Nouvelle Aventure",
                text: data.story || "",
                choices: Array.isArray(data.choices) ? data.choices : [],
                imageUrl: data.image_url || "",
                history: [data.story || ""]
            };

            console.log("Histoire générée :", this.currentStory);
            await this.updateUI();
        } catch (error) {
            this.handleError('Erreur lors de la génération de l\'histoire', error);
        } finally {
            this.hideLoadingState();
        }
    }

    async makeChoice(choice) {
        console.log(`Choix effectué : ${choice}`);
        this.showLoadingState();

        try {
            const data = await this.fetchData('/make_choice', { 
                choice, 
                story_so_far: this.currentStory.history.join(' '),
                current_image_url: this.currentStory.imageUrl
            });
            console.log("Réponse du serveur pour le choix :", data);

            this.currentStory.text = data.story || "";
            this.currentStory.choices = Array.isArray(data.choices) ? data.choices : [];
            this.currentStory.history.push(choice);
            this.currentStory.history.push(data.story || "");
            await this.updateUI();
        } catch (error) {
            this.handleError('Erreur lors du choix', error);
        } finally {
            this.hideLoadingState();
        }
    }

    async fetchData(url, body) {
        console.log(`Envoi de requête à ${url}`, body);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async updateUI() {
        console.log("Début de la mise à jour de l'interface");
        try {
            this.showElement(this.elements.storyContainer);
            this.showElement(this.elements.imageContainer);
            this.elements.mainTitle.textContent = this.currentStory.title;
            console.log("Titre mis à jour :", this.currentStory.title);

            console.log("Texte à animer :", this.currentStory.text);
            await this.animateText(this.elements.storyText, this.formatText(this.currentStory.text));
            console.log("Animation du texte terminée");

            await this.updateImage(this.currentStory.imageUrl);
            this.updateChoices(this.currentStory.choices);

            if (this.shouldLaunchMinigame()) {
                console.log("Lancement du mini-jeu");
                this.launchMinigame();
            } else {
                this.hideElement(this.elements.minigameContainer);
            }
            console.log("Mise à jour de l'interface terminée");
        } catch (error) {
            console.error("Erreur dans updateUI:", error);
            this.handleError('Erreur lors de la mise à jour de l\'interface', error);
        }
    }

    formatText(text) {
        return text.replace(/\.(?!\s*[A-Z][a-z]|\d)/g, '.\n\n');
    }

    async animateText(element, text) {
        console.log("Début de l'animation du texte");
        if (!text) {
            console.warn("Texte vide ou null dans animateText");
            element.textContent = "";
            return;
        }
        const words = text.split(' ');
        element.textContent = '';
        for (const word of words) {
            element.textContent += word + ' ';
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.log("Fin de l'animation du texte");
    }

    updateImage(imageUrl) {
        console.log(`Mise à jour de l'image : ${imageUrl}`);
        return new Promise((resolve) => {
            this.elements.storyImage.src = imageUrl;
            this.elements.storyImage.onload = () => {
                this.hideElement(this.elements.imageLoader);
                this.showElement(this.elements.storyImage);
                console.log("Image chargée avec succès");
                resolve();
            };
            this.elements.storyImage.onerror = () => {
                this.hideElement(this.elements.imageLoader);
                this.elements.imageContainer.textContent = 'Erreur de chargement de l\'image';
                console.error("Erreur de chargement de l'image");
                resolve();
            };
        });
    }

    updateChoices(choices) {
        console.log("Mise à jour des choix :", choices);
        this.elements.choices.innerHTML = '';
        if (!Array.isArray(choices)) {
            console.warn("Les choix ne sont pas un tableau :", choices);
            return;
        }
        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.textContent = choice;
            if (index === choices.length - 1) {
                button.classList.add('bad-choice');
            }
            button.addEventListener('click', () => this.makeChoice(choice));
            this.elements.choices.appendChild(button);
        });
        console.log("Choix mis à jour");
    }

    shouldLaunchMinigame() {
        return this.currentStory.history.length % 3 === 0;
    }

    launchMinigame() {
        console.log("Lancement du mini-jeu");
        this.minigame.active = true;
        this.minigame.targetNumber = Math.floor(Math.random() * 100) + 1;
        this.minigame.attempts = 0;
        this.elements.minigameDescription.textContent = `Devinez un nombre entre 1 et 100. Vous avez ${this.minigame.maxAttempts} essais.`;
        this.elements.minigameResult.textContent = '';
        this.showElement(this.elements.minigameContainer);
    }

    handleMinigameGuess() {
        if (!this.minigame.active) return;

        const guess = parseInt(this.elements.minigameInput.value);
        this.minigame.attempts++;

        console.log(`Tentative de devinette : ${guess}`);

        if (guess === this.minigame.targetNumber) {
            this.elements.minigameResult.textContent = `Bravo ! Vous avez deviné le nombre en ${this.minigame.attempts} essais.`;
            this.minigame.active = false;
            this.minigameSuccess();
        } else if (this.minigame.attempts >= this.minigame.maxAttempts) {
            this.elements.minigameResult.textContent = `Désolé, vous avez épuisé vos essais. Le nombre était ${this.minigame.targetNumber}.`;
            this.minigame.active = false;
            this.minigameFailure();
        } else if (guess < this.minigame.targetNumber) {
            this.elements.minigameResult.textContent = 'Trop bas ! Essayez encore.';
        } else {
            this.elements.minigameResult.textContent = 'Trop haut ! Essayez encore.';
        }
    }

    minigameSuccess() {
        console.log("Succès du mini-jeu");
        this.currentStory.text += "\n\nVotre succès au mini-jeu vous donne un avantage dans votre aventure !";
        this.updateUI();
    }

    minigameFailure() {
        console.log("Échec du mini-jeu");
        this.currentStory.text += "\n\nVotre échec au mini-jeu rend votre aventure plus difficile...";
        this.updateUI();
    }

    showElement(element) {
        element.classList.remove('hidden');
    }

    hideElement(element) {
        element.classList.add('hidden');
    }

    showLoadingState() {
        console.log("Affichage de l'état de chargement");
        this.showElement(this.elements.loadingAnimation);
        this.showElement(this.elements.imageLoader);
    }

    hideLoadingState() {
        console.log("Masquage de l'état de chargement");
        this.hideElement(this.elements.loadingAnimation);
        this.hideElement(this.elements.imageLoader);
    }

    clearUI() {
        console.log("Nettoyage de l'interface utilisateur");
        this.elements.storyText.textContent = '';
        this.elements.storyImage.src = '';
        this.hideElement(this.elements.storyImage);
        this.elements.choices.innerHTML = '';
        this.currentStory = { title: '', text: '', choices: [], imageUrl: '', history: [] };
    }

    handleError(message, error) {
        console.error(message, error);
        const errorDetails = error.stack || error.message || String(error);
        this.elements.storyText.textContent = `${message}. Veuillez réessayer.\n\nDétails de l'erreur :\n${errorDetails}`;
        
        // Afficher l'erreur dans la console pour le débogage
        console.error("Détails de l'erreur:", errorDetails);
    }
}

// Initialisation du jeu lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation du jeu");
    window.adventureGame = new AdventureGame();
});

// Fonction de débogage globale
window.debugAdventureGame = function() {
    console.log("État actuel du jeu:", window.adventureGame);
    console.log("Histoire actuelle:", window.adventureGame.currentStory);
    console.log("État du mini-jeu:", window.adventureGame.minigame);
}