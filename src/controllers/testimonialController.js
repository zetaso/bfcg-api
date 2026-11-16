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

export const createTestimonial = async (req, res, next) => {
  try {
    const {
      client_name,
      quote,
      service_id,
      client_role,
      is_featured,
      display_order
    } = req.body;
    const { data, error } = await supabase
      .from("testimonials")
      .insert([{
        client_name,
        quote,
        service_id,
        client_role,
        is_featured,
        display_order
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    next(err);
  }
};
