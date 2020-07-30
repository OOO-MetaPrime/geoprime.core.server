'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      update public.spatial_data_registry_field set show_when_selected = true where id in (select name_field_id from public.spatial_data_registry);
    `)
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      update public.spatial_data_registry_field set show_when_selected = false where id in (select name_field_id from public.spatial_data_registry);
    `)
  }
}
