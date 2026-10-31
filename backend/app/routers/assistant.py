from typing import List
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.database import get_database
from backend.app.models.schemas import ChatMessage, AskQuestionRequest
from backend.app.services.rag_service import RAGService

router = APIRouter(prefix="/api/investigations/{investigation_id}", tags=["AI Assistant"])

@router.post("/ask", response_model=ChatMessage)
async def ask_assistant(
    investigation_id: str,
    payload: AskQuestionRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        # Also record user question in chat history
        await db["chat_messages"].insert_one({
            "investigationId": investigation_id,
            "id": f"user-{id(payload)}",
            "role": "user",
            "content": payload.question,
            "citations": []
        })
        
        reply = await RAGService.ask(
            db=db,
            investigation_id=investigation_id,
            question=payload.question
        )
        return reply
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages", response_model=List[ChatMessage])
async def get_chat_history(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db["chat_messages"].find({"investigationId": investigation_id}, {"_id": 0})
    messages = await cursor.to_list(length=100)
    return messages

@router.delete("/messages")
async def clear_chat_history(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    await db["chat_messages"].delete_many({"investigationId": investigation_id})
    return {"status": "success", "message": "Conversation history cleared"}
