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

export const createSiteSetting = async (req, res, next) => {
  try {
    const {key, label, value} = req.body;
    const { data, error } = await supabase
      .from("site_settings")
      .insert([{key, label, value}])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    next(err);
  }
};
