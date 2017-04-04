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

	//StartInstanceHandler list instaces
	var StartInstanceHandler = func(rw http.ResponseWriter, r *http.Request) {
	}

	//GetInstanceHandler list instaces
	var GetInstanceHandler = func(rw http.ResponseWriter, r *http.Request) {
	}

	//RestartInstanceHandler list instaces
	var RestartInstanceHandler = func(rw http.ResponseWriter, r *http.Request) {
	}

	//StopInstanceHandler list instaces
	var StopInstanceHandler = func(rw http.ResponseWriter, r *http.Request) {
	}

	//ListInstancesHandler list instaces
	var ListInstancesHandler = func(rw http.ResponseWriter, r *http.Request) {

		log.Info("Fetching instances")

		list, err := ListInstances(cfg)
		if err != nil {
			log.Info("Panic fetching instances %v", err)
			panic(err)
		}

		log.Info("Fetched instances %v", list)

		b, err := json.Marshal(list)
		if err != nil {
			panic(err)
		}

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
	v2router.Methods("POST").Path("/instances").HandlerFunc(StartInstanceHandler)
	v2router.Methods("GET").Path("/instances/{id}").HandlerFunc(GetInstanceHandler)
	v2router.Methods("PUT").Path("/instances/{id}").HandlerFunc(RestartInstanceHandler)
	v2router.Methods("DELETE").Path("/instances/{id}").HandlerFunc(StopInstanceHandler)

	log.Infof("Starting API at %s", cfg.APIPort)
	return http.ListenAndServe(cfg.APIPort, r)
}
