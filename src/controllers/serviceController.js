import { supabase } from '../config/supabase.js';

export const getServices = async (req, res) => {
  try {
    // fetch active services ordered by display_order
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (servicesError) throw servicesError;

    // fetch all service highlights (deliverables, steps, faqs)
    const { data: highlights, error: highlightsError } = await supabase
      .from('service_highlights')
      .select('*')
      .order('display_order', { ascending: true });

    if (highlightsError) throw highlightsError;

    // attach highlights to their respective services
    const servicesWithHighlights = services.map(service => ({
      ...service,
      highlights: highlights.filter(h => h.service_id === service.id)
    }));

    return res.status(200).json({
      success: true,
      data: servicesWithHighlights
    });

  } catch (err) {
    console.error('Error fetching services:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching services.'
    });
  }
};

export const createServiceHighlight = async (res, req) => {
  try {
    const {
      service_id,
      item_type,
      title,
      content,
      display_order,
    } = req.body;
    const { data, error } = await supabase
      .from("site_settings")
      .insert([{
        service_id,
        item_type,
        title,
        content,
        display_order,
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    next(err);
  }
}