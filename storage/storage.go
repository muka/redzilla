package storage

import (
	"github.com/nanobox-io/golang-scribble"
)

//Store abstract a simple store
type Store struct {
	filepath string
	db       *scribble.Driver
}

//Record store a minimal element with an identifier
type Record interface {
	getId() string
}

//New create a new storage
func New(path string) Store {
	s := Store{
		path,
		nil,
	}
	s.init()
	return s
}

//init the database
func (s Store) init() {

	if s.db == nil {
		// create a new scribble database, providing a destination for the database to live
		db, err := scribble.New(s.filepath, nil)
		if err != nil {
			panic(err)
		}

		s.db = db
	}

}

//Save a record
func (s Store) Save(table string, record Record) error {
	return s.db.Write(table, record.getId(), record)
}

//Load a record
func (s Store) Load(table string, id string, result interface{}) error {
	return s.db.Read(table, id, result)
}

//List all records
func (s Store) List(table string) ([]string, error) {
	return s.db.ReadAll(table)
}
