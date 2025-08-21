const { supabase } = require('../lib/supabase');
const { categoryToServiceTypeMapping, migrateCategoryToServiceType } = require('../lib/service-type-migration');

async function migrateServiceTypes() {
  try {
    console.log('Starting service type migration...');

    // First, let's see what categories currently exist
    const { data: existingServices, error: fetchError } = await supabase
      .from('services')
      .select('id, category_name');

    if (fetchError) {
      console.error('Error fetching existing services:', fetchError);
      return;
    }

    console.log(`Found ${existingServices.length} services to migrate`);

    // Group services by current category
    const categoryCounts: { [key: string]: number } = {};
    existingServices.forEach((service: any) => {
      const category = service.category_name || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    console.log('Current category distribution:', categoryCounts);

    // Migrate each service
    let migratedCount = 0;
    let errorCount = 0;

    for (const service of existingServices) {
      try {
        const oldCategory = service.category_name || 'general';
        const newServiceType = migrateCategoryToServiceType(oldCategory);

        const { error: updateError } = await supabase
          .from('services')
          .update({ 
            category_name: newServiceType,
          })
          .eq('id', service.id);

        if (updateError) {
          console.error(`Error updating service ${service.id}:`, updateError);
          errorCount++;
        } else {
          migratedCount++;
          console.log(`Migrated service ${service.id}: ${oldCategory} -> ${newServiceType}`);
        }
      } catch (error) {
        console.error(`Error processing service ${service.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Migration completed: ${migratedCount} services migrated, ${errorCount} errors`);

    // Show final distribution
    const { data: finalServices, error: finalFetchError } = await supabase
      .from('services')
      .select('category_name');

    if (!finalFetchError && finalServices) {
      const finalCategoryCounts: { [key: string]: number } = {};
      finalServices.forEach((service: any) => {
        const category = service.category_name || 'unknown';
        finalCategoryCounts[category] = (finalCategoryCounts[category] || 0) + 1;
      });

      console.log('Final category distribution:', finalCategoryCounts);
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateServiceTypes().catch(console.error);
