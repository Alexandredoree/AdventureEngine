from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
GPT_MODEL = os.getenv('GPT_MODEL', 'gpt-3.5-turbo')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    theme = request.json['theme']
    try:
        story = generate_story(theme)
        image_url = generate_image(theme)
        choices = generate_choices(story)
        return jsonify({
            "story": story,
            "image_url": image_url,
            "choices": choices
        })
    except Exception as e:
        app.logger.error(f"Error in /generate: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/make_choice', methods=['POST'])
def make_choice():
    choice = request.json['choice']
    story_so_far = request.json['story_so_far']
    current_image_url = request.json['current_image_url']
    try:
        story_continuation = generate_story_continuation(story_so_far, choice)
        choices = generate_choices(story_continuation)
        return jsonify({
            "story": story_continuation,
            "image_url": current_image_url,  # Réutiliser l'URL de l'image existante
            "choices": choices
        })
    except Exception as e:
        app.logger.error(f"Error in /make_choice: {str(e)}")
        return jsonify({"error": str(e)}), 500

def generate_story(theme):
    prompt = f"""Générer une histoire interactive en français sur le thème '{theme}'. 
    L'histoire doit commencer par une introduction captivante.
    N'incluez pas de choix dans cette partie, seulement le début de l'histoire."""
    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": "Vous êtes un générateur d'histoires interactives en français."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        app.logger.error(f"Error in generate_story: {str(e)}")
        raise

def generate_story_continuation(story_so_far, choice):
    prompt = f"""Voici l'histoire jusqu'à présent : {story_so_far}

Le lecteur a choisi : {choice}

Continuez l'histoire en tenant compte du choix et du contexte précédent.
N'incluez pas de nouveaux choix dans cette partie, seulement la continuation de l'histoire."""
    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": "Vous êtes un générateur d'histoires interactives en français."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        app.logger.error(f"Error in generate_story_continuation: {str(e)}")
        raise

def generate_choices(story):
    prompt = f"""Générez exactement trois choix pour la suite de cette histoire : 
    {story}

    Les deux premiers choix doivent être des options intéressantes et positives. 
    Le troisième choix doit être une mauvaise option menant à une issue terrible.
    
    Format de réponse attendu :
    1. [Premier choix positif]
    2. [Deuxième choix positif]
    3. [Choix négatif]
    
    Assurez-vous que chaque choix soit complet et clairement formulé."""
    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": "Vous êtes un générateur de choix pour des histoires interactives."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200
        )
        choices = response.choices[0].message.content.strip().split('\n')
        return [choice.split('. ', 1)[1] for choice in choices if choice.strip()]
    except Exception as e:
        app.logger.error(f"Error in generate_choices: {str(e)}")
        raise

def generate_image(theme):
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=f"Une illustration représentant le thème '{theme}' pour une histoire interactive",
            n=1,
            size="1024x1024"
        )
        return response.data[0].url
    except Exception as e:
        app.logger.error(f"Error in generate_image: {str(e)}")
        raise

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)