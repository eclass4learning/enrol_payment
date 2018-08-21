define(['jquery', 'core/modal_factory', 'core/modal_events'], function($, ModalFactory, ModalEvents) {

    /**
     * JavaScript functionality for the enrol_ecommerce enrol.html page
     */
    var EnrolPage = {

        /**
         * Functions dealing with the multi-user registration system
         */
        MultipleRegistration: {

            enabled: false,

            /**
             * Counts up to make sure no two email inputs will ever
             * have the same ID.
             */
            nextEmailID: 1,

            /**
             * Reads email input fields, ignoring any that are whitespace-only.
             * @return An array of emails that have been inputted
             */
            getEmails: function() {
                var emails = [];

                $(".mr-email-line input").each(function() {
                    var email = $(this).val();
                    if($.trim(email) !== "") {
                        emails.push(email);
                    }
                });
                return emails;
            },

            /*
             * Handles a click on the plus sign next to each email input field,
             * adding a new input field and updating the enumeration.
             *
             * @param plus      The plus icon to attach a handler to
             * @param wwwroot   Moodle's wwwroot string
             */
            addPlusClickHandler: function(plus,wwwroot) {
                var self = this;

                plus.click(function() {
                    // Get HTML for the field we will create
                    var nextHtml = self.makeEmailEntryLine(wwwroot);

                    // Remove all plus signs (there should only be one at any
                    // given time)
                    $(".plus-container").remove();

                    // Add the new HTML to the bottom of our container, and update its click handlers.
                    var newLine = $("#multiple-registration-container").append(nextHtml);
                    self.addPlusClickHandler($('.plus-container'), wwwroot);
                    self.addMinusClickHandler(newLine.find('.minus-container'), wwwroot);
                });
            },

            /*
             * Handles a click on the minus sign next to each email input field,
             * adding a new input field and updating the enumeration.
             *
             * @param minus      The minus icon to attach a handler to
             * @param wwwroot   Moodle's wwwroot string
             */
            addMinusClickHandler: function(minus,wwwroot) {
                var self = this;

                minus.click(function() {
                    //Pop the whole email input line off the DOM.
                    $(this).parent().remove();

                    //Add a plus icon to the last line, if it's not already there
                    if (! $(".mr-email-line:last .plus-container").length) {
                        $(".mr-email-line:last").append(self.makePlusSign(wwwroot));
                        self.addPlusClickHandler($('.plus-container'), wwwroot);
                    }

                    //Re-number our rows for the user
                    self.refreshEmailNums();
                });
            },

            /**
             * Returns HTML for a plus icon
             *
             * @param wwwroot   Moodle's wwwroot string.
             */
            makePlusSign: function(wwwroot) {
                var plusSign = "<div class=\"plus-container\"><img src=\""
                             + wwwroot + "/enrol/ecommerce/pix/plus.svg\" class=\"plus\"></div>";
                return plusSign;
            },

            /**
             * Returns HTML for a plus sign and a minus sign if there is more
             * than one row already, and just a plus sign if there is only one
             * row.
             *
             * @param n         Number of rows (including this one) that already exist
             * @param wwwroot   Moodle's wwwroot string
             */
            makePlusAndMinusSigns: function(n, wwwroot) {
                var plusSign = this.makePlusSign(wwwroot);
                var minusSign = "<div class=\"minus-container\"><img src=\""
                             + wwwroot + "/enrol/ecommerce/pix/minus.svg\" class=\"minus\"></div>";
                if (n > 1) {
                    return plusSign + minusSign;
                } else {
                    return plusSign;
                }
            },

            /**
             * Re-numbers the email labels on the frontend.
             *
             * @return The next number to use.
             */
            refreshEmailNums: function() {
                var lastIndex = -1;
                $('.email-num').each(function(index) {
                    $(this).text(index + 1);
                    lastIndex = index;
                });
                return lastIndex + 2;
            },

            /**
             * @return HTML for one row of the email entry form.
             */
            makeEmailEntryLine: function(wwwroot) {
                var self = this;
                var m = self.refreshEmailNums();
                var n = self.nextEmailID;
                self.nextEmailID = self.nextEmailID + 1;

                var inputID = "\"multiple-registration-email-" + n + "\"";
                var div = "<div class=\"mr-email-line\">";
                var label = "<div class=\"mr-email-label-container\"><label for=" + inputID + ">"
                          + "Email <span class=\"email-num\">" + m + "</span>:&nbsp;&nbsp;&nbsp;</label></div>";
                var emailEntryLine = "<input id=" + inputID + " type=\"text\" class=\"multiple-registration-email\" />";
                var endDiv = "</div>";

                // Passing n into makePlusAndMinusSigns works because the first
                // row never gets a minus.
                return div + label + emailEntryLine + this.makePlusAndMinusSigns(n,wwwroot) + endDiv;
            },

            /**
             * @param r The raw AJAX response
             */
            handleEmailSubmitAJAXResponse: function(discount, r, provider) {
                var response = JSON.parse(r);
                if(response["success"]) {

                    //var modalInfo = self.createSuccessModalString(response["users"]);
                    var trigger = $("#success-modal-trigger");
                    trigger.off();
                    ModalFactory.create({
                        type: ModalFactory.types.SAVE_CANCEL,
                        title: "Continue Checkout",
                        body: response["successmessage"],
                        savechanges: "Confirm",
                        cancel: "Cancel"
                    }, trigger).done(function(modal) {
                        modal.getRoot().on(ModalEvents.save, function(e) {
                            e.preventDefault();
                            $("#enrol-ecommerce-paypal-checkout").submit();
                        });
                    });
                    $("#success-modal-trigger").click();
                } else {
                    var trigger = $("#error-modal-trigger");
                    trigger.off();
                    ModalFactory.create({
                        type: ModalFactory.types.DEFAULT,
                        body: response["failmessage"],
                        closebuttontitle: "Dismiss",
                    }, trigger);
                    $('#error-modal-trigger').click();
                }
            },

            /**
             * Checks emails for multiple registration, and submits payment to
             * PayPal.
             */
            verifyAndSubmit: function(instanceid, wwwroot, discount, provider) {
                if((provider !== 'paypal') && (provider !== 'stripe')) {
                    alert("Invalid payment provider.");
                    throw new Error("Invalid payment provider.");
                }
                var self = this;

                var emails = self.getEmails();
                if (!emails.length) {
                    alert("No valid emails have been entered.");
                } else {
                    var ajaxURL = wwwroot + "/enrol/ecommerce/ajax/multiple_enrol.php";
                    $.ajax({
                        url: ajaxURL,
                        method: "POST",
                        data: {
                                'instanceid': instanceid,
                                'emails': JSON.stringify(emails),
                                'ipn_id': $("#enrol-ecommerce-paypal-checkout-custom").val()
                              },
                        context: document.body,
                        success: function(r) {self.handleEmailSubmitAJAXResponse(discount, r, provider);}
                    });
                }
            },

            /**
             * Handles a click on the Multiple Registration button
             *
             * @param instanceid    Database ID of this plugin instance
             * @param wwwroot       Moodle's wwwroot string
             * @param btn           JQuery object for the button
             */
            multipleRegistration: function(instanceid, wwwroot, btn) {
                var self = this;

                //If the button is to enable, build the multiple registration
                //form.
                if(btn.hasClass('enable-mr')) {
                    self.enabled = true;
                    self.nextEmailID = 1;
                    //Build DOM for a multiple-registration form

                    btn.text("Cancel multiple registration");
                    btn.removeClass('enable-mr').addClass('disable-mr');
                    $("#enrol-ecommerce-submit").val("Verify emails and send payment");
                    $("#multiple-registration-container").html(this.makeEmailEntryLine(wwwroot));
                    self.addPlusClickHandler($(".plus-container"), wwwroot);

                } else if (btn.hasClass('disable-mr')) {
                    self.enabled = false;
                    //Return to single registration mode

                    btn.text("Multiple Registration");
                    btn.removeClass('disable-mr').addClass('enable-mr');
                    $("#enrol-ecommerce-submit").val("Send payment via PayPal");
                    $("#enrol-ecommerce-submit").removeClass('multiple-enrol');
                    $(".mr-email-line").remove();
                }
            },
        },

        Discount: {
            checkDiscountCode: function(instanceid, wwwroot) {
                var discountcode = $("#discountcode").val();
                var checkURL = wwwroot + "/enrol/ecommerce/check_discount.php";

                $.ajax({
                    url: checkURL,
                    data: { 'discountcode': discountcode
                          , 'instanceid': instanceid
                          },
                    context: document.body,
                    success: function(r) {
                        var response = JSON.parse(r);
                        if (response["success"]) {
                            var discounted_cost = response["discounted_cost"];
                            $("span#localisedcost").text(discounted_cost);
                            $("input[name=amount]").val(discounted_cost);
                        } else {
                            alert("Invalid discount code.");
                        }
                    }
                });
            },
        },

        init: function(instanceid,wwwroot) {
            var self = this;
            $("#apply-discount").click(function() { self.Discount.handleDiscountCode(instanceid, wwwroot); });
            $("#multiple-registration-btn").click(function() {
                self.MultipleRegistration.multipleRegistration(instanceid, wwwroot, $(this));
            });
            $("#enrol-ecommerce-submit").click(function(e) {
                if(self.MultipleRegistration.enabled) {
                    e.preventDefault();
                    self.MultipleRegistration.verifyAndSubmit(instanceid, wwwroot, self.Discount, provider);
                }
            });
        }
    };

    return EnrolPage;

});
