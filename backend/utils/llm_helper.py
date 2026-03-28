import os
import re
import json
from groq import Groq

def detect_columns_with_groq(df):
    """
    Uses the Groq LLM (LLaMA 3 8B) to intelligently detect
    the target column and sensitive attribute from a DataFrame.
    """
    # Extract schema info: column names + up to 3 unique values per column
    columns = list(df.columns)
    sample_data = {}
    for col in columns:
        # Drop nulls, get unique values, take the first 3, convert to standard Python list
        sample_data[col] = df[col].dropna().unique()[:3].tolist()

    schema_description = (
        f"Column names: {columns}\n"
        f"Sample unique values per column:\n{json.dumps(sample_data, indent=2, default=str)}"
    )

    prompt = f"""You are an expert data scientist specializing in fairness auditing of machine learning models.

Given the following dataset schema, identify:
1. The **target column** (the column the model is trying to predict, e.g., loan approval, income bracket, credit risk).
2. The **sensitive column** (the column that represents a protected demographic attribute, e.g., gender, race, age).

Dataset Schema:
{schema_description}

You MUST respond with ONLY a valid JSON object in this exact format, with no extra text, no markdown, no explanation:
{{"target_column": "exact_column_name", "sensitive_column": "exact_column_name"}}"""

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that only responds with valid JSON. No markdown, no code fences, no explanation."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model="llama-3.3-70b-versatile",
        temperature=0,
        max_tokens=150,
    )

    raw_response = chat_completion.choices[0].message.content.strip()

    # Parse the JSON response, handling potential quirks
    try:
        result = json.loads(raw_response)
    except json.JSONDecodeError:
        # Try to extract JSON from the response if the model wrapped it
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "error": "LLM did not return valid JSON",
                "raw_response": raw_response
            }

    return result
