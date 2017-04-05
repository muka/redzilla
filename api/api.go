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

// JSONError a JSON response in case of error
type JSONError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// GetJSONErrorMessage produce a JSON error message
func GetJSONErrorMessage(code int, message string) []byte {
	res, err := json.Marshal(JSONError{code, message})
	if err != nil {
		panic(err)
	}
	return res
}

// ResponseWithError send an error response with a common JSON message
func ResponseWithError(rw http.ResponseWriter, code int, message string) {
	log.Infof("Error response [%d] %s", code, message)
	rw.WriteHeader(code)
	rw.Write([]byte(GetJSONErrorMessage(code, message)))
}

//StartServer start API HTTP server
func StartServer(cfg *model.Config) error {

	//InstanceHandler handle instance operations
	var InstanceHandler = func(rw http.ResponseWriter, r *http.Request) {

		vars := mux.Vars(r)
		name := vars["name"]

		log.Debugf("Instance req %s name:%s", r.Method, name)

		instance := NewInstance(name, cfg)

		instanceMustExists := func() bool {
			exists, err := instance.Exists()
			if err != nil {
				ResponseWithError(rw, 500, err.Error())
				return false
			}
			if !exists {
				ResponseWithError(rw, 404, "Not found")
				return false
			}
			return true
		}

		switch r.Method {
		case http.MethodGet:
			log.Debugf("Load instance %s", name)

			if !instanceMustExists() {
				return
			}

			break
		case http.MethodPost:
			log.Debugf("Start instance %s", name)

			err := instance.Start()

			if err != nil {
				ResponseWithError(rw, 500, err.Error())
				return
			}

			rw.WriteHeader(202)

			break
		case http.MethodPut:
			log.Debugf("Restart instance %s", name)

			if !instanceMustExists() {
				return
			}

			err := instance.Restart()
			if err != nil {
				ResponseWithError(rw, 500, err.Error())
				return
			}

			rw.WriteHeader(202)

			break
		case http.MethodDelete:
			log.Debugf("Stop instance %s", name)

			if !instanceMustExists() {
				return
			}

			err := instance.Stop()
			if err != nil {
				ResponseWithError(rw, 500, err.Error())
				return
			}

			rw.WriteHeader(202)
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
	v2router.Methods("GET", "POST", "PUT", "DELETE").Path("/instances/{name:[A-Za-z0-9_-]+}").HandlerFunc(InstanceHandler)

	log.Infof("Starting API at %s", cfg.APIPort)
	return http.ListenAndServe(cfg.APIPort, r)
}
