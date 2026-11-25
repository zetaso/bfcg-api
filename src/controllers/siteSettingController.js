import { supabase } from "../config/supabase.js";

export const getSiteSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};
