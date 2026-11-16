import { supabase } from "../config/supabase.js";

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    const file = req.file;
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage bucket named 'images'
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    // Get the public URL to send back to your frontend
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    res.status(201).json({
      message: "Image uploaded successfully!",
      url: publicUrlData.publicUrl,
    });
  } catch (err) {
    next(err);
  }
};
