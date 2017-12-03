package api

import (
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"

	"github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
)

var reverseProxy *httputil.ReverseProxy

func websocketProxy(target string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, err := net.Dial("tcp", target)
		if err != nil {
			http.Error(w, "Error contacting backend server.", 500)
			logrus.Printf("Error dialing websocket backend %s: %v", target, err)
			return
		}
		hj, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "Not a hijacker?", 500)
			return
		}
		nc, _, err := hj.Hijack()
		if err != nil {
			logrus.Printf("Hijack error: %v", err)
			return
		}
		defer nc.Close()
		defer d.Close()

		err = r.Write(d)
		if err != nil {
			logrus.Printf("Error copying request to target: %v", err)
			return
		}

		errc := make(chan error, 2)
		cp := func(dst io.Writer, src io.Reader) {
			_, err := io.Copy(dst, src)
			errc <- err
		}
		go cp(d, nc)
		go cp(nc, d)
		<-errc
	})
}

// newReverseProxy creates a reverse proxy that will redirect request to sub instances
func newReverseProxy(cfg *model.Config) *httputil.ReverseProxy {
	director := func(req *http.Request) {}
	return &httputil.ReverseProxy{
		Director: director,
	}
}

func isWebsocket(req *http.Request) bool {
	connHeader := ""
	connHeaders := req.Header["Connection"]
	if len(connHeaders) > 0 {
		connHeader = connHeaders[0]
	}

	upgradeWebsocket := false
	if strings.ToLower(connHeader) == "upgrade" {
		upgradeHeaders := req.Header["Upgrade"]
		if len(upgradeHeaders) > 0 {
			upgradeWebsocket = (strings.ToLower(upgradeHeaders[0]) == "websocket")
		}
	}

	return upgradeWebsocket
}

//Handler for proxyed router requests
func proxyHandler(cfg *model.Config) func(c *gin.Context) {
	reverseProxy = newReverseProxy(cfg)
	return func(c *gin.Context) {

		name := extractSubdomain(c.Request.Host, cfg)
		if len(name) == 0 {
			logrus.Debugf("Empty subdomain name at %s", c.Request.URL.String())
			notFound(c)
			return
		}

		logrus.Debugf("Proxying %s name=%s ", c.Request.URL, name)

		instance := GetInstance(name, cfg)
		if instance == nil {
			notFound(c)
			return
		}

		running, err := instance.IsRunning()
		if err != nil {
			internalError(c, err)
			return
		}

		if !running {
			logrus.Debugf("Container %s not running", name)
			if cfg.Autostart {
				serr := instance.Start()
				if serr != nil {
					internalError(c, serr)
					return
				}
			}
		}

		ip, err := instance.GetIP()
		if err != nil {
			internalError(c, err)
			return
		}

		c.Request.Host = ip + ":" + NodeRedPort

		c.Request.URL.Scheme = "http"
		c.Request.URL.Host = c.Request.Host

		if isWebsocket(c.Request) {
			wsURL := c.Request.URL.Hostname() + ":" + c.Request.URL.Port()
			logrus.Debugf("Serving WS %s", wsURL)
			p := websocketProxy(wsURL)
			p.ServeHTTP(c.Writer, c.Request)
			return
		}

		reverseProxy.ServeHTTP(c.Writer, c.Request)
	}
}
