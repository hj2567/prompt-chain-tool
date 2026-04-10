import type { SupabaseClient } from "@supabase/supabase-js";

/** Same rules as the flavor library create form — used for duplicate preview + DB slug. */
export function slugifyHumorFlavorSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function duplicateHumorFlavor(
  supabase: SupabaseClient,
  params: { sourceFlavorId: number; newSlug: string }
): Promise<{ newFlavorId: number }> {
  const cleanSlug = slugifyHumorFlavorSlug(params.newSlug);
  if (!cleanSlug) {
    throw new Error("Enter a valid slug (letters, numbers, hyphens).");
  }

  const { data: existing, error: existingErr } = await supabase
    .from("humor_flavors")
    .select("id")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (existingErr) {
    throw new Error(existingErr.message || "Could not verify slug uniqueness.");
  }
  if (existing) {
    throw new Error(`Slug "${cleanSlug}" is already in use. Choose another name.`);
  }

  const { data: sourceFlavor, error: flavorErr } = await supabase
    .from("humor_flavors")
    .select("id, description")
    .eq("id", params.sourceFlavorId)
    .single();

  if (flavorErr || !sourceFlavor) {
    throw new Error(flavorErr?.message ?? "Source flavor not found.");
  }

  const { data: inserted, error: insertFlavorErr } = await supabase
    .from("humor_flavors")
    .insert({
      slug: cleanSlug,
      description: sourceFlavor.description,
    })
    .select("id")
    .single();

  if (insertFlavorErr || inserted?.id == null) {
    throw new Error(insertFlavorErr?.message ?? "Failed to create duplicated flavor.");
  }

  const newFlavorId = Number(inserted.id);

  const { data: stepRows, error: stepsErr } = await supabase
    .from("humor_flavor_steps")
    .select(
      "order_by, humor_flavor_step_type_id, llm_input_type_id, llm_output_type_id, llm_model_id, llm_temperature, llm_system_prompt, llm_user_prompt"
    )
    .eq("humor_flavor_id", params.sourceFlavorId)
    .order("order_by", { ascending: true });

  if (stepsErr) {
    await supabase.from("humor_flavors").delete().eq("id", newFlavorId);
    throw new Error(stepsErr.message);
  }

  if (stepRows && stepRows.length > 0) {
    const rows = stepRows.map((s) => ({
      humor_flavor_id: newFlavorId,
      order_by: s.order_by,
      humor_flavor_step_type_id: s.humor_flavor_step_type_id,
      llm_input_type_id: s.llm_input_type_id,
      llm_output_type_id: s.llm_output_type_id,
      llm_model_id: s.llm_model_id,
      llm_temperature: s.llm_temperature,
      llm_system_prompt: s.llm_system_prompt,
      llm_user_prompt: s.llm_user_prompt,
    }));

    const { error: insertStepsErr } = await supabase
      .from("humor_flavor_steps")
      .insert(rows);

    if (insertStepsErr) {
      await supabase.from("humor_flavors").delete().eq("id", newFlavorId);
      throw new Error(insertStepsErr.message);
    }
  }

  return { newFlavorId };
}
