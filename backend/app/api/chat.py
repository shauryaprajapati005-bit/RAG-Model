from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.chat import AssistantResponse, ChatMessageOut, ChatQuery
from app.services.data_store import add_message_to_conversation, build_assistant_response, clear_conversation, get_conversation

router = APIRouter(prefix="/investigations/{investigation_id}", tags=["assistant"])


@router.post("/assistant/query", response_model=AssistantResponse)
def ask_question(investigation_id: str, payload: ChatQuery):
    response = build_assistant_response(payload.question)
    add_message_to_conversation(investigation_id, "user", payload.question)
    add_message_to_conversation(
        investigation_id,
        "assistant",
        response["answer"],
        citations=response.get("citations", []),
    )
    return response


@router.get("/assistant/conversation", response_model=list[ChatMessageOut])
def get_chat_history(investigation_id: str):
    return get_conversation(investigation_id)


@router.delete("/assistant/conversation", response_model=list[ChatMessageOut])
def reset_chat_history(investigation_id: str):
    return clear_conversation(investigation_id)
