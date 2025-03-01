import type { Server } from "bun";
import { queries } from "../database";
import type { AppState } from "../types";

export async function handleRegistrarCreate(req: Request, state: AppState) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    // Validate input
    if (!body.id || !body.password) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: id and password"
      }), { status: 400 });
    }

    // Validate registrar ID format
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(body.id)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid registrar ID format. Use lowercase letters, numbers, and hyphens. Must start and end with letter or number."
      }), { status: 400 });
    }

    // Validate password strength
    if (body.password.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: "Password must be at least 8 characters long"
      }), { status: 400 });
    }

    const result = queries.createRegistrar(state.db, body.id, body.password);

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), { status: 409 });
    }

    return new Response(JSON.stringify({ id: result.registrarId }), { status: 201 });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error"
    }), { status: 500 });
  }
}
