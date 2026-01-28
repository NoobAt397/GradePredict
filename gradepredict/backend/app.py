import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@app.route("/")
def home():
    return jsonify({"message": "GradePredict API is running"})


@app.route("/api/test", methods=["POST"])
def test_groq():
    """Test endpoint that calls Groq API and returns a response."""
    data = request.get_json() or {}
    prompt = data.get("prompt", "Say hello and introduce yourself briefly.")

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant for grading assignments.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            model="llama-3.1-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
        )

        response_text = chat_completion.choices[0].message.content
        return jsonify({"success": True, "response": response_text})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
