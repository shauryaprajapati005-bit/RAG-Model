"""Custom application exceptions."""

from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str = "Validation error"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class ProcessingError(HTTPException):
    def __init__(self, detail: str = "Processing error"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


class VectorSearchNotReadyError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The MongoDB Atlas Vector Search index is not ready. "
                "Please create the 'caseconnect_vector_index' index on the 'chunks' collection "
                "with path='embedding', numDimensions=384, similarity='cosine'."
            ),
        )

