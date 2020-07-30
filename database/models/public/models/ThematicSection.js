'use strict'

/**
 * Тематический раздел
 */
module.exports = (sequelize, DataTypes) => {
  const thematicSection = sequelize.define('thematicSection', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isObsolete: {
      field: 'is_obsolete',
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
    // В вебе сделан как линейный

    // parentId: {
    //   type: DataTypes.UUID,
    //   field: 'parent_id',
    //   allowNull: false
    // }
  }, {
    tableName: 'thematic_section',
    freezeTableName: true,
    timestamps: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  return thematicSection
}
