package models

import "gorm.io/gorm"

type Role struct {
	gorm.Model
	Name  string `gorm:"unique;not null"`
	Users []User `gorm:"foreignKey:RoleID;references:ID"`
}
