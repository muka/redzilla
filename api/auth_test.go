package api

import (
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"testing"
	"time"

	"github.com/muka/redzilla/model"
)

func TestAuthReqPost(t *testing.T) {

	reqArgs := &RequestBodyTemplate{
		HeaderKey: "Authorization",
		HeaderVal: "Bearer foobar",
		Method:    "POST",
		Name:      "myInstance",
		Url:       "/v2/instances/myInstance",
	}

	tmpl, err := template.New("").Parse(`{ "foo": "bar", "instance": "{{.Name}}" }`)
	if err != nil {
		t.Fatal(err)
	}

	a := &model.AuthHttp{
		Body:   tmpl,
		Header: "Authorization",
		Method: "POST",
		URL:    "http://localhost:50999/test",
	}

	go func() {
		h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			headerValue := r.Header.Get(reqArgs.HeaderKey)
			body, err1 := ioutil.ReadAll(r.Body)
			if err1 != nil {
				t.Fatal(err1)
				return
			}

			fmt.Printf("Got request `%s %s`\n", r.Method, r.URL.String())
			fmt.Printf("Header `%s`\n", headerValue)
			fmt.Printf("Body `%s`\n", body)

			w.WriteHeader(http.StatusUnauthorized)
		})
		err1 := http.ListenAndServe("localhost:50999", h)
		if err1 != nil {
			t.Fatal(err1)
		}
	}()

	time.Sleep(time.Millisecond * 500)

	res, err := doRequest(reqArgs, a)
	if err != nil {
		t.Fatal(err)
	}

	fmt.Printf("Result %t\n", res)
	time.Sleep(time.Millisecond * 500)
}
