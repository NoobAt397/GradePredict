import json
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


@app.route("/api/grade", methods=["POST"])
def grade_assignment():
    """Grade an assignment based on a rubric using Groq API."""
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "error": "No JSON data provided"}), 400

    assignment_text = data.get("assignment_text")
    rubric = data.get("rubric")

    if not assignment_text:
        return jsonify({"success": False, "error": "assignment_text is required"}), 400
    if not rubric:
        return jsonify({"success": False, "error": "rubric is required"}), 400

    # Format rubric for the prompt
    rubric_text = "\n".join(
        [
            f"- {c['name']} (max {c['max_score']} points): {c['description']}"
            for c in rubric
        ]
    )

    prompt = f"""You are an expert grader. Grade this assignment based on the rubric.

RUBRIC:
{rubric_text}

ASSIGNMENT:
{assignment_text}

Return JSON with:
- criteria_scores: array of {{"criterion_name", "score", "max_score", "reasoning"}}
- total_score
- total_possible
- percentage
- letter_grade (A, B, C, D, or F)"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert assignment grader. Always respond with valid JSON only.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            model="llama-3.1-70b-versatile",
            temperature=0.3,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )

        response_text = chat_completion.choices[0].message.content
        grade_result = json.loads(response_text)
        return jsonify({"success": True, "result": grade_result})

    except json.JSONDecodeError as e:
        return jsonify({"success": False, "error": f"Failed to parse AI response: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
