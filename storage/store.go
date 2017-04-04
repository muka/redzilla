package storage

import (
	"github.com/nanobox-io/golang-scribble"
)

//Store abstract a simple store
type Store struct {
	filepath string
	db       *scribble.Driver
}

//NewStore create a new storage
func NewStore(path string) *Store {

	// create a new scribble database, providing a destination for the database to live
	db, err := scribble.New(path, nil)
	if err != nil {
		panic(err)
	}

	s := Store{
		filepath: path,
		db:       db,
	}

	return &s
}

//Save a record
func (s Store) Save(table string, id string, record interface{}) error {
	return s.db.Write(table, id, record)
}

//Load a record
func (s Store) Load(table string, id string, result interface{}) error {
	return s.db.Read(table, id, result)
}

//Delete a record
func (s Store) Delete(table string, id string) error {
	return s.db.Delete(table, id)
}

//List all records
func (s Store) List(table string) ([]string, error) {
	return s.db.ReadAll(table)
}
