package api

import (
	"encoding/json"
	"net/http"

	log "github.com/Sirupsen/logrus"
	recovery "github.com/albrow/negroni-json-recovery"
	"github.com/codegangsta/negroni"
	"github.com/gorilla/mux"
	"github.com/muka/redzilla/model"
)

//StartServer start API HTTP server
func StartServer(cfg *model.Config) error {

	//InstanceHandler handle instance operations
	var InstanceHandler = func(rw http.ResponseWriter, r *http.Request) {

		vars := mux.Vars(r)
		id := vars["id"]

		log.Infof("Instance req id:%s", id)

		switch r.Method {
		case http.MethodGet:

			break
		case http.MethodPost:

			break
		case http.MethodDelete:

			break

		}
	}

	//ListInstancesHandler list instaces
	var ListInstancesHandler = func(rw http.ResponseWriter, r *http.Request) {

		log.Info("Fetching instances")

		list, err := ListInstances(cfg)
		if err != nil {
			log.Info("Panic fetching instances: %s", err)
			panic(err)
		}

		log.Info("Fetched instances")
		b, err := json.Marshal(list)
		if err != nil {
			panic(err)
		}

		rw.Header().Add("content-type", "application/json")
		rw.Write(b)
	}

	//AuthMiddleware API authentication
	var AuthMiddleware = func(rw http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
		log.Debug("Skipping authentication")
		next(rw, r)
	}

	r := mux.NewRouter().StrictSlash(false)

	v2router := r.PathPrefix("/v2").Handler(negroni.New(
		recovery.JSONRecovery(true),
		negroni.HandlerFunc(AuthMiddleware),
		// negroni.NewLogger(),
	)).Subrouter()

	v2router.Methods("GET").Path("/instances").HandlerFunc(ListInstancesHandler)
	v2router.Methods("GET", "POST", "PUT", "DELETE").Path("/instances/{id}").HandlerFunc(InstanceHandler)

	log.Infof("Starting API at %s", cfg.APIPort)
	return http.ListenAndServe(cfg.APIPort, r)
}
