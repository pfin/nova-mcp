"""Project info tool for Nova Memory MCP server."""

from loguru import logger

from nova_memory.mcp.project_session import get_active_project
from nova_memory.mcp.async_client import client
from nova_memory.mcp.server import mcp
from nova_memory.mcp.tools.utils import call_get
from nova_memory.schemas import ProjectInfoResponse


@mcp.resource(
    uri="memory://project_info",
    description="Get information and statistics about the current Nova Memory project.",
)
async def project_info() -> ProjectInfoResponse:
    """Get comprehensive information about the current Nova Memory project.

    This tool provides detailed statistics and status information about your
    Nova Memory project, including:

    - Project configuration
    - Entity, observation, and relation counts
    - Graph metrics (most connected entities, isolated entities)
    - Recent activity and growth over time
    - System status (database, watch service, version)

    Use this tool to:
    - Verify your Nova Memory installation is working correctly
    - Get insights into your knowledge base structure
    - Monitor growth and activity over time
    - Identify potential issues like unresolved relations

    Returns:
        Detailed project information and statistics

    Examples:
        # Get information about the current project
        info = await project_info()

        # Check entity counts
        print(f"Total entities: {info.statistics.total_entities}")

        # Check system status
        print(f"Nova Memory version: {info.system.version}")
    """
    logger.info("Getting project info")
    project_config = get_active_project()
    project_url = project_config.project_url

    # Call the API endpoint
    response = await call_get(client, f"{project_url}/project/info")

    # Convert response to ProjectInfoResponse
    return ProjectInfoResponse.model_validate(response.json())
