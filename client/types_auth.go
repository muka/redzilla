package client

// https://nodered.org/docs/api/admin/methods/get/auth/login/

type Prompt struct {
	Id    string
	Type  string
	Value string
}

type AuthScheme struct {
	Type    string
	Prompts []Prompt
}

type AuthRevoke struct {
	Token string
}

// IsActive check if there is an auth scheme enabled
func (a *AuthScheme) IsActive() bool {
	return len(a.Type) > 0
}

// https://nodered.org/docs/api/admin/methods/post/auth/token/

type AuthTokenRequest struct {
	ClientId  string `json:"client_id"`
	GrantType string `json:"grant_type"`
	Scope     string
	Username  string
	Password  string
}

type AuthToken struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   string `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

func NewAuthTokenRequest() AuthTokenRequest {
	return AuthTokenRequest{
		ClientId:  "node-red-admin",
		GrantType: "password",
		Scope:     "*",
	}
}
