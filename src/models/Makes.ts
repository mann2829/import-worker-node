// src/models/Makes.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface MakeAttributes {
  id: number;
  name: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

interface MakeCreationAttributes extends Optional<MakeAttributes, 'id'> {}

class Make extends Model<MakeAttributes, MakeCreationAttributes> implements MakeAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date;
}

Make.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_at: {
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    allowNull: true,
    type: DataTypes.DATE,
  },
  deleted_at: {
    allowNull: true,
    type: DataTypes.DATE,
  },
}, {
  sequelize,
      modelName: "Make",
      tableName: "makes",
      timestamps: true,
      paranoid: true,
      underscored: true,
});

export default Make;
