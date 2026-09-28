package com.prasannjeet.klokka.logto;

import io.quarkus.oidc.client.filter.OidcClientFilter;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

// The slice of the Logto Management API Klokka uses (https://openapi.logto.io), called as the klokka-api M2M
// application: the OIDC client filter adds a client-credentials bearer for https://default.logto.app/api.
@RegisterRestClient(configKey = "logto")
@OidcClientFilter
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface LogtoManagementApi {

    @GET
    @Path("/organizations")
    List<LogtoModels.Organization> listOrganizations(@QueryParam("page") int page, @QueryParam("page_size") int pageSize);

    @POST
    @Path("/organizations")
    LogtoModels.Organization createOrganization(LogtoModels.CreateOrganization body);

    @DELETE
    @Path("/organizations/{id}")
    void deleteOrganization(@PathParam("id") String id);

    @POST
    @Path("/organizations/{id}/users")
    void addUsers(@PathParam("id") String id, LogtoModels.UserIds body);

    @POST
    @Path("/organizations/{id}/users/{userId}/roles")
    void assignUserRoles(@PathParam("id") String id, @PathParam("userId") String userId, LogtoModels.OrganizationRoleIds body);

    @DELETE
    @Path("/organizations/{id}/users/{userId}")
    void removeUser(@PathParam("id") String id, @PathParam("userId") String userId);

    @POST
    @Path("/organization-invitations")
    LogtoModels.Invitation createInvitation(LogtoModels.CreateInvitation body);

    @PUT
    @Path("/organization-invitations/{id}/status")
    LogtoModels.Invitation updateInvitationStatus(@PathParam("id") String id, LogtoModels.InvitationStatusUpdate body);

    @DELETE
    @Path("/organization-invitations/{id}")
    void deleteInvitation(@PathParam("id") String id);

    @GET
    @Path("/users/{id}")
    LogtoModels.User getUser(@PathParam("id") String id);
}
