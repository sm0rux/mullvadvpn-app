//
//  Router.swift
//  MullvadVPN
//
//  Created by pronebird on 01/04/2021.
//  Copyright © 2021 Mullvad VPN AB. All rights reserved.
//

import UIKit

enum Route: String {
    case consent
    case login
    case connect
}

struct RouteTransition {
    let source: Route
    let destination: Route
    let sourceController: UIViewController
    let destinationController: UIViewController
}

protocol RouterDelegate: class {
    func router(_ router: Router, willTransition routeTransition: RouteTransition, completion: @escaping () -> Void)
}

class Router {
    private(set) var route: Route?
    private let routeHandler: RouteHandler

    private let operationQueue = OperationQueue()
    private var source: UIViewController?

    weak var delegate: RouterDelegate?

    init(routeHandler: RouteHandler) {
        self.routeHandler = routeHandler

        operationQueue.maxConcurrentOperationCount = 1
    }

    func navigate(to newRoute: Route) {
        let operation = AsyncBlockOperation { (finish) in
            DispatchQueue.main.async {
                let destinationController = self.routeHandler.viewController(for: newRoute)

                if let state = self.route {
                    let routeTransition = RouteTransition(
                        source: state,
                        destination: newRoute,
                        sourceController: self.source,
                        destinationController: destinationController
                    )

                    let transition = {
                        self.routeHandler.transition(routeTransition: routeTransition) {
                            self.route = newRoute
                            self.source = destinationController
                            finish()
                        }
                    }

                    if let delegate = self.delegate {
                        delegate.router(self, willTransition: routeTransition) {
                            transition()
                        }
                    } else {
                        transition()
                    }
                } else {
                    self.routeHandler.setup(with: newRoute)
                    self.route = newRoute
                    self.source = destinationController
                }
            }
        }
        operationQueue.addOperation(operation)
    }

}

protocol RouteHandler: class {
    func setup(with route: Route)
    func transition(routeTransition: RouteTransition, completion: @escaping () -> Void)
    func viewController(for route: Route) -> UIViewController?
}

class BaseRouteHandler: RouteHandler {
    let rootContainer = RootContainerViewController()
    let window: UIWindow

    init(window: UIWindow) {
        self.window = window
    }

    func setup(with route: Route) {
        // no-op
    }

    func transition(routeTransition: RouteTransition, completion: @escaping () -> Void) {
        // no-op
    }

    func viewController(for route: Route) -> UIViewController {
        fatalError()
    }

}

class PhoneRouteHandler: BaseRouteHandler {

    override func setup(with route: Route) {
        switch route {
        case .connect:
            let loginController = self.viewController(for: .login)
            let mainController = self.viewController(for: route)
            rootContainer.setViewControllers([loginController, mainController], animated: false)

        case .consent, .login:
            let controller = self.viewController(for: route)
            rootContainer.setViewControllers([controller], animated: false)
        }

        self.window.rootViewController = rootContainer
    }

    override func transition(routeTransition: RouteTransition, completion: @escaping () -> Void) {
        switch (routeTransition.source, routeTransition.destination) {
        case (.consent, .login):
            rootContainer.pushViewController(routeTransition.destinationController, animated: true, completion: completion)

        case (.consent, .connect), (.login, .connect):
            rootContainer.pushViewController(routeTransition.destinationController, animated: true, completion: completion)

        case (.connect, .login):
            rootContainer.popToRootViewController(animated: true, completion: completion)

        case (.connect, .consent):
            rootContainer.setViewControllers([routeTransition.destinationController], animated: true, completion: completion)

        default:
            fatalError("Unsupported transition from \(routeTransition.source) to \(routeTransition.destination)")
        }
    }

    override func viewController(for route: Route) -> UIViewController {
        switch route {
        case .consent:
            return ConsentViewController()
        case .login:
            return LoginViewController()
        case .connect:
            return ConnectViewController()
        }
    }
}

class PadRouteHandler: BaseRouteHandler {

    override func setup(with route: Route) {
        switch route {
        case .connect:
            break

        case .consent, .login:
            let controller = self.viewController(for: route)
            rootContainer.present(controller, animated: false)
        }

        rootContainer.setViewControllers([self.viewController(for: .connect)], animated: false)
        self.window.rootViewController = rootContainer
    }

    override func transition(routeTransition: RouteTransition, completion: @escaping () -> Void) {
        switch (routeTransition.source, routeTransition.destination) {
        case (.consent, .login):
            routeTransition.sourceController.dismiss(animated: true) {
                self.rootContainer.present(routeTransition.destinationController, animated: true, completion: completion)
            }

        case (.consent, .connect), (.login, .connect):
            routeTransition.sourceController.dismiss(animated: true, completion: completion)

        case (.connect, .login):
            rootContainer.present(routeTransition.destinationController, animated: true, completion: completion)

        case (.connect, .consent):
            fatalError()

        default:
            fatalError("Unsupported transition from \(routeTransition.source) to \(routeTransition.destination)")
        }
    }

    override func viewController(for route: Route) -> UIViewController {
        switch route {
        case .consent:
            return ConsentViewController()
        case .login:
            return LoginViewController()
        case .connect:
            return ConnectViewController()
        }
    }
}
