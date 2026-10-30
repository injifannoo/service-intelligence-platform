import string
from pathlib import Path
from typing import Any, Dict

from app.core.exceptions import (
    PromptTemplateNotFoundError,
    PromptVariableInterpolationError,
)

PROMPTS_DIR = Path(__file__).resolve().parent


def get_prompt_path(template_name: str) -> Path:
    clean_name = template_name if template_name.endswith(".txt") else f"{template_name}.txt"
    return PROMPTS_DIR / clean_name


def load_prompt(template_name: str, **variables: Any) -> str:
    prompt_file = get_prompt_path(template_name)

    if not prompt_file.is_file():
        raise PromptTemplateNotFoundError(template_name=template_name)

    with open(prompt_file, mode="r", encoding="utf-8") as f:
        template_content = f.read()

    if not variables:
        return template_content

    # Validate that all required placeholder keys exist in the provided variables
    formatter = string.Formatter()
    try:
        required_fields = {
            field_name
            for _, field_name, _, _ in formatter.parse(template_content)
            if field_name is not None
        }
    except ValueError as e:
        raise PromptVariableInterpolationError(
            template_name=template_name,
            missing_variable=f"Template parse error: {str(e)}",
        )

    for field in required_fields:
        if field not in variables:
            raise PromptVariableInterpolationError(
                template_name=template_name,
                missing_variable=field,
            )

    try:
        return template_content.format(**variables)
    except KeyError as e:
        raise PromptVariableInterpolationError(
            template_name=template_name,
            missing_variable=str(e),
        )