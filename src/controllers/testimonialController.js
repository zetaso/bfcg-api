import { supabase } from "../config/supabase.js";

export const getTestimonials = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("testimonials").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};
