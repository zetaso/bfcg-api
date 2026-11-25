import { supabase } from "../config/supabase.js";

export const getTestimonials = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("display_order")
      .order("created_at");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};
