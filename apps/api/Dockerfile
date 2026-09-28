# Klokka API: the Quarkus fast-jar on a JRE 25 base, non-root, port 8080 (docs/research/backend-and-infra.md 6).
# Build the jar first, then the image with apps/api as the context:
#   JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn mvn -f apps/api/pom.xml -DskipTests package
#   docker build -t klokka-api apps/api
FROM eclipse-temurin:25-jre

# What /operator/health reports as the running version (image.sh passes <pom version>-<short sha>).
ARG KLOKKA_BUILD_VERSION=dev
ENV KLOKKA_BUILD_VERSION=$KLOKKA_BUILD_VERSION

RUN useradd --system --uid 1001 --user-group klokka
WORKDIR /app

COPY --chown=1001:1001 service/target/quarkus-app/lib/ lib/
COPY --chown=1001:1001 service/target/quarkus-app/*.jar ./
COPY --chown=1001:1001 service/target/quarkus-app/app/ app/
COPY --chown=1001:1001 service/target/quarkus-app/quarkus/ quarkus/

USER klokka
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENV QUARKUS_PROFILE=prod

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dquarkus.http.host=0.0.0.0 -jar quarkus-run.jar"]
