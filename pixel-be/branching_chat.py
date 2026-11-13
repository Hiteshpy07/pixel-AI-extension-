import os
import uuid
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from graph_store import GraphStore, GraphNode
from screen_analyzer import ScreenAnalyzer, ScreenAnalysisResult

load_dotenv()


class BranchingChatEngine:
    def __init__(self, graph_store: Optional[GraphStore] = None):
        self.graph_store = graph_store or GraphStore()
        self.screen_analyzer = ScreenAnalyzer()
        self.api_key = os.getenv("GEMINI_API_KEY")

    def _get_llm(self, model_name: str = "gemini-2.5-flash") -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key
        )

    async def ingest_screen(
        self,
        image_bytes: bytes,
        parent_node_id: Optional[str] = None,
        project_name: Optional[str] = None,
        prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        screen_id = f"screen_{uuid.uuid4().hex[:8]}"
        analysis: ScreenAnalysisResult = self.screen_analyzer.analyze_screenshot(
            image_bytes=image_bytes,
            screen_id=screen_id,
            user_project_hint=project_name
        )

        project_title = analysis.active_project
        project_node_id = f"proj_{project_title.lower().replace(' ', '_')}"
        project_node = self.graph_store.get_node(project_node_id)
        if not project_node:
            project_node = self.graph_store.add_node(
                node_type="project",
                title=f"Project: {project_title}",
                content=f"Workspace for {project_title}",
                node_id=project_node_id
            )

        screen_node = self.graph_store.add_node(
            node_type="screen",
            title=f"Screen: {analysis.active_project} ({len(analysis.diagram_crops)} diagrams)",
            content=analysis.code_and_text[:500] if analysis.code_and_text else "No text extracted",
            parent_id=parent_node_id or project_node.id,
            meta={
                "tabs": analysis.detected_tabs,
                "project": analysis.active_project,
                "diagram_count": len(analysis.diagram_crops),
                "full_code": analysis.code_and_text
            },
            node_id=screen_id
        )

        self.graph_store.add_edge(screen_node.id, project_node.id, "belongs_to_project")

        response_node = None
        if prompt:
            response_node = await self.create_chat_branch(
                parent_node_id=screen_node.id,
                user_prompt=prompt
            )

        return {
            "screen_node": screen_node,
            "project_node": project_node,
            "response_node": response_node,
            "analysis": analysis
        }

    async def create_chat_branch(
        self,
        parent_node_id: str,
        user_prompt: str,
        model_name: str = "gemini-2.5-flash"
    ) -> GraphNode:
        history_chain = self.graph_store.get_branch_history(parent_node_id)

        user_node = self.graph_store.add_node(
            node_type="chat_message",
            title=f"User: {user_prompt[:35]}...",
            content=user_prompt,
            parent_id=parent_node_id,
            meta={"role": "user", "model": model_name}
        )

        system_instructions = (
            "You are Pixel, an advanced AI screen companion and software engineering agent. "
            "You are exploring a focused branch in a spatial conversation tree. "
            "Stay strictly relevant to this branch's context and questions."
        )
        messages = [SystemMessage(content=system_instructions)]

        for node in history_chain:
            if node.node_type == "screen":
                code_snippet = node.meta.get("full_code", node.content)
                tabs = node.meta.get("tabs", [])
                context_summary = f"[SCREEN CONTEXT]\nActive Tabs: {tabs}\nCode/Text:\n{code_snippet}\n"
                messages.append(HumanMessage(content=context_summary))
            elif node.node_type == "chat_message":
                role = node.meta.get("role", "user")
                if role == "assistant":
                    messages.append(AIMessage(content=node.content))
                else:
                    messages.append(HumanMessage(content=node.content))

        messages.append(HumanMessage(content=user_prompt))

        llm = self._get_llm(model_name)
        response_text = ""
        try:
            ai_response = await llm.ainvoke(messages)
            response_text = ai_response.content
        except Exception as e:
            print(f"[branching_chat] Model {model_name} failed: {e}. Trying fallback...")
            fallback_llm = self._get_llm("gemini-2.0-flash")
            ai_response = await fallback_llm.ainvoke(messages)
            response_text = ai_response.content

        assistant_node = self.graph_store.add_node(
            node_type="chat_message",
            title=f"Pixel: {response_text[:35]}...",
            content=response_text,
            parent_id=user_node.id,
            meta={"role": "assistant", "model": model_name}
        )

        return assistant_node
