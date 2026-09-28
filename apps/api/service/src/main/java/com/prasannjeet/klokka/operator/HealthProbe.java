package com.prasannjeet.klokka.operator;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.HealthStatus;
import com.prasannjeet.klokka.contract.model.OperatorDependency;
import com.prasannjeet.klokka.logto.LogtoService;
import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

// Live probes for the operator health page: Postgres (one query), Logto (Management API self-check), SMTP (a TCP
// connect), and the web, landing and API deployments by HTTP GET with a short timeout. Every probe is bounded.
@ApplicationScoped
public class HealthProbe {

    @Inject
    AgroalDataSource dataSource;

    @Inject
    LogtoService logto;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @ConfigProperty(name = "quarkus.mailer.host")
    String mailHost;

    @ConfigProperty(name = "quarkus.mailer.port")
    int mailPort;

    public List<OperatorDependency> probeAll() {
        List<OperatorDependency> out = new ArrayList<>();
        out.add(postgres());
        out.add(logto());
        out.add(smtp());
        config.operator().apiUrl().ifPresent(url -> out.add(http("api", url.resolve("/q/health/ready"))));
        out.add(http("web", config.webBaseUrl()));
        config.operator().landingUrl().ifPresent(url -> out.add(http("landing", url)));
        return out;
    }

    OperatorDependency postgres() {
        long started = System.nanoTime();
        try (Connection c = dataSource.getConnection(); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select version()")) {
            rs.next();
            String version = rs.getString(1);
            int end = version.indexOf(" on ");
            return dependency("postgres", HealthStatus.UP, ms(started), end > 0 ? version.substring(0, end) : version);
        } catch (SQLException e) {
            return dependency("postgres", HealthStatus.DOWN, ms(started), e.getMessage());
        }
    }

    OperatorDependency logto() {
        LogtoService.SelfCheck check = logto.selfCheck();
        return dependency("logto", check.reachable() ? HealthStatus.UP : HealthStatus.DOWN, check.latencyMs(), check.detail());
    }

    OperatorDependency smtp() {
        long started = System.nanoTime();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(mailHost, mailPort), (int) config.operator().probeTimeout().toMillis());
            return dependency("smtp", HealthStatus.UP, ms(started), mailHost + ":" + mailPort);
        } catch (IOException | IllegalArgumentException e) {
            return dependency("smtp", HealthStatus.DOWN, ms(started), mailHost + ":" + mailPort + " " + e.getMessage());
        }
    }

    OperatorDependency http(String name, URI url) {
        long started = System.nanoTime();
        Duration timeout = config.operator().probeTimeout();
        try (HttpClient client = HttpClient.newBuilder().connectTimeout(timeout).followRedirects(HttpClient.Redirect.NORMAL).build()) {
            HttpResponse<Void> response = client.send(HttpRequest.newBuilder(url).timeout(timeout).GET().build(),
                    HttpResponse.BodyHandlers.discarding());
            HealthStatus status = response.statusCode() < 400 ? HealthStatus.UP
                    : response.statusCode() < 500 ? HealthStatus.DEGRADED : HealthStatus.DOWN;
            return dependency(name, status, ms(started), "HTTP " + response.statusCode() + " from " + url);
        } catch (IOException | RuntimeException e) {
            return dependency(name, HealthStatus.DOWN, ms(started), url + " " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return dependency(name, HealthStatus.DOWN, ms(started), "interrupted");
        }
    }

    private OperatorDependency dependency(String name, HealthStatus status, long latencyMs, String detail) {
        return new OperatorDependency().name(name).status(status).latencyMs((int) latencyMs).detail(detail)
                .checkedAt(clock.instant().atOffset(ZoneOffset.UTC));
    }

    private static long ms(long startedNanos) {
        return (System.nanoTime() - startedNanos) / 1_000_000;
    }

    static Optional<String> none() {
        return Optional.empty();
    }
}
