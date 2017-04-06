package storage

import (
	"path/filepath"

	"github.com/nanobox-io/golang-scribble"
)

//Store abstract a simple store
type Store struct {
	filepath   string
	db         *scribble.Driver
	collection string
}

//NewStore create a new storage
func NewStore(collection string, path string) *Store {

	// create a new scribble database, providing a destination for the database to live
	db, err := scribble.New(path, nil)
	if err != nil {
		panic(err)
	}

	err = CreateDir(filepath.Join(path, collection))
	if err != nil {
		panic(err)
	}

	s := Store{
		filepath:   path,
		db:         db,
		collection: collection,
	}

	return &s
}

//Save a record
func (s Store) Save(id string, record interface{}) error {
	return s.db.Write(s.collection, id, record)
}

//Load a record
func (s Store) Load(id string, result interface{}) error {
	return s.db.Read(s.collection, id, result)
}

//Delete a record
func (s Store) Delete(id string) error {
	return s.db.Delete(s.collection, id)
}

//List all records
func (s Store) List() ([]string, error) {
	return s.db.ReadAll(s.collection)
}
