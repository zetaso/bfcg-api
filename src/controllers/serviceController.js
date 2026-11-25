import { supabase } from '../config/supabase.js';

export const getServices = async (req, res) => {
  try {
    // fetch active services ordered by display_order
    const { data: services, error } = await supabase
      .from('services')
      .select(`
        *,
        highlights:service_highlights (*)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('display_order', { referencedTable: 'service_highlights', ascending: true });

    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      data: services
    });
  } catch (err) {
    console.error('Error fetching services:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching services.'
    });
  }
};

export const getService= async (req, res) => {
  try {
    const { slug } = req.params;
    
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        highlights:service_highlights (*)
      `)
      .eq('slug', slug)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    return res.status(200).json({
      success: true,
      data: { ...service}
    });
  } catch (err) {
    console.error('Error fetching service detail:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error while fetching service detail.' });
  }
};
